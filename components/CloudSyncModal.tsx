import React, { useState, useEffect } from 'react';



// ✅ 1. 只引入，不创建！直接使用我们刚才封装好的统一客户端

import { supabase } from '../utils/supabaseClient';



// ================= 辅助函数 =================



// 判断一个考勤值是否有效

const isValid = (val: any) => {

  return val !== undefined && val !== null && String(val).trim() !== '';

};



// 🟢 深度合并逻辑 (核心大脑)

const mergeDataDeeply = (cloudData: Record<string, any>) => {

  const allKeys = new Set([...Object.keys(cloudData), ...Object.keys(localStorage)]);



  allKeys.forEach(key => {

    // 只处理本软件的数据

    if (!key.startsWith('workgrid_')) return;



    const localStr = localStorage.getItem(key);

    const cloudVal = cloudData[key];



    // 1. 如果云端没有，本地有 -> 保留本地，跳过

    if (!cloudVal) return;



    // 2. 如果本地没有，云端有 -> 直接写入本地

    if (!localStr) {

      const valToSave = typeof cloudVal === 'string' ? cloudVal : JSON.stringify(cloudVal);

      localStorage.setItem(key, valToSave);

      return;

    }



    // 3. 两边都有 -> 根据数据类型智能合并

    try {

      const localJson = JSON.parse(localStr);

      const cloudJson = Array.isArray(cloudVal) ? cloudVal : JSON.parse(cloudVal);



      // A. 项目列表 (workgrid_projects) -> 按 ID 合并

      if (key === 'workgrid_projects') {

          const map = new Map();

          localJson.forEach((p:any) => map.set(p.id, p));

          cloudJson.forEach((p:any) => map.set(p.id, p)); // 云端优先

          localStorage.setItem(key, JSON.stringify(Array.from(map.values())));

          return;

      }



      // 🟢 B. 施工日志 (workgrid_construction_logs_xxx) -> 按日志 ID 合并

      if (key.startsWith('workgrid_construction_logs_')) {

          const map = new Map();

          localJson.forEach((l:any) => map.set(l.id, l));

          cloudJson.forEach((l:any) => map.set(l.id, l)); // 云端优先

          localStorage.setItem(key, JSON.stringify(Array.from(map.values())));

          console.log(`✅ 合并日志成功: ${key}`);

          return;

      }



      // 🟢 C. 班组配置 (workgrid_log_team_config_) -> 直接覆盖

      if (key.startsWith('workgrid_log_team_config_')) {

          localStorage.setItem(key, JSON.stringify(cloudJson));

          return;

      }



      // D. 考勤数据 (workgrid_data_xxx) -> 按人名深度合并

      if (key.startsWith('workgrid_data_')) {

          const empMap = new Map();

          localJson.forEach((e:any) => empMap.set(e.name, e));

         

          cloudJson.forEach((ce:any) => {

              const le = empMap.get(ce.name);

              if (!le) {

                  empMap.set(ce.name, ce);

              } else {

                  // 深度合并 days

                  const mergedDays = { ...le.days };

                  for (let d = 1; d <= 31; d++) {

                      const cd = ce.days[d] || {};

                      if (!mergedDays[d]) mergedDays[d] = { morning:'', afternoon:'', overtime:'' };

                      if (isValid(cd.morning)) mergedDays[d].morning = cd.morning;

                      if (isValid(cd.afternoon)) mergedDays[d].afternoon = cd.afternoon;

                      if (isValid(cd.overtime)) mergedDays[d].overtime = cd.overtime;

                  }

                  empMap.set(ce.name, { ...le, ...ce, days: mergedDays });

              }

          });

          localStorage.setItem(key, JSON.stringify(Array.from(empMap.values())));

          return;

      }



      // E. 其他数据 -> 直接覆盖

      const valToSave = typeof cloudJson === 'string' ? cloudJson : JSON.stringify(cloudJson);

      localStorage.setItem(key, valToSave);



    } catch (e) {

      // 解析失败，直接覆盖

      console.warn(`合并 key [${key}] 出错，执行强制覆盖`, e);

      const valToSave = typeof cloudVal === 'string' ? cloudVal : JSON.stringify(cloudVal);

      localStorage.setItem(key, valToSave);

    }

  });

};



// ================= 组件 UI =================



interface CloudSyncModalProps {

  isOpen: boolean;

  onClose: () => void;

  onUploadSuccess: () => void;

  onDownloadSuccess: () => void;

  userEmail: string | undefined;

}



export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, onUploadSuccess, onDownloadSuccess, userEmail }) => {

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState('');



  useEffect(() => {

    if (isOpen) setStatus('');

  }, [isOpen]);



  if (!isOpen) return null;



  // 🟢 收集本地数据

  const gatherLocalData = () => {

    const data: Record<string, any> = {};

    for (let i = 0; i < localStorage.length; i++) {

      const key = localStorage.key(i);

      // 排除 Supabase 自身的 token，只备份 workgrid 数据

      if (key && key.startsWith('workgrid_')) {

        try {

          data[key] = JSON.parse(localStorage.getItem(key) || 'null');

        } catch (e) {

          data[key] = localStorage.getItem(key);

        }

      }

    }

    return data;

  };



  const handleUpload = async () => {

    setLoading(true);

    setStatus('正在打包上传...');

    try {

      const localData = gatherLocalData();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("未登录");



      const { error } = await supabase

        .from('user_backups')

        .upsert({

          user_id: user.id,

          data: localData,

          updated_at: new Date().toISOString()

        });



      if (error) throw error;

      setStatus('✅ 上传成功！');

      setTimeout(() => { onUploadSuccess(); onClose(); }, 1000);

    } catch (e: any) {

      console.error(e);

      setStatus(`❌ 上传失败: ${e.message}`);

    } finally {

      setLoading(false);

    }

  };



  const handleDownload = async () => {

    setLoading(true);

    setStatus('正在拉取云端数据...');

    try {

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) { alert("请先登录！"); setLoading(false); return; }



      const { data, error } = await supabase

        .from('user_backups')

        .select('data')

        .eq('user_id', session.user.id)

        .single();



      if (error) {

        if (error.code === 'PGRST116') { alert("云端暂无备份数据"); setLoading(false); return; }

        throw error;

      }



      if (data && data.data) {

        console.log("📥 下载成功，开始合并...");

        // 调用新的合并逻辑

        mergeDataDeeply(data.data);

       

        setStatus('✅ 合并成功，正在刷新...');

        setTimeout(() => {

            if (onDownloadSuccess) onDownloadSuccess();

            onClose();

            window.location.reload();

        }, 1000);

      } else {

        alert("云端备份数据为空");

      }

    } catch (error: any) {

      setStatus(`❌ 同步失败: ${error.message}`);

    } finally {

      setLoading(false);

    }

  };



// 🚪 [修复] 暴力退出登录，防止卡死

 const handleLogout = async () => {

    if (confirm("确定要退出当前账号吗？")) {

      // 1. 尝试告诉服务器退出 (不等待结果，防止服务器卡顿导致按钮没反应)

      supabase.auth.signOut().catch(() => {});

     

      // 2. 🟢【核心修复】暴力清除本地 Supabase 凭证

      // 遍历所有 LocalStorage，只要是 sb- 开头的（Supabase token）统统删掉

      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        // 只要是以 sb- 开头，或者是 supabase 相关的，都标记删除

        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {

          keysToRemove.push(key);

        }

      }

      keysToRemove.forEach(k => localStorage.removeItem(k));



      // 3. 关闭弹窗并强制刷新页面，重置所有状态

      onClose();

      window.location.reload();

    }

  };



  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-6">

        <div className="flex justify-between items-center">

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">

            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.1 0-5.7 2.2-6.4 5.3C.2 15.6-.2 16.1.1 16.6c.3.9 1.1 1.6 2 1.9 0 0 .1 0 .1.1.2.2.5.3.9.4H17.5z"/><path d="M12 10V4"/><path d="m8 8 4-4 4 4"/></svg>

            云端数据同步

            </h3>

            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

        </div>



        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100 flex items-center justify-between">

           <div className="flex items-start gap-3">

               <div className="mt-0.5 text-blue-600">

                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>

               </div>

               <div>

                 <div className="text-xs text-blue-500 font-bold mb-0.5">当前账号：</div>

                 <div className="font-medium">{userEmail}</div>

               </div>

           </div>

           

           <button onClick={handleLogout} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md text-xs font-medium transition-colors flex items-center gap-1">

             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

             退出

           </button>

        </div>



        {status && (

            <div className={`p-3 rounded-lg text-sm text-center font-medium ${status.includes('成功') ? 'bg-green-100 text-green-800' : status.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>

                {status}

            </div>

        )}



        <div className="grid grid-cols-2 gap-4 pt-2">

            <button onClick={handleUpload} disabled={loading} className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 active:scale-95">

                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>

                上传本地数据

            </button>

            <button onClick={handleDownload} disabled={loading} className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-lg font-bold transition-all disabled:opacity-50 active:scale-95">

                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

                拉取云端数据

            </button>

        </div>

      </div>

    </div>

  );

};