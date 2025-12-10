import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  // 格式化输入：每4位加横杠
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const fmt = raw.slice(0, 16).match(/.{1,4}/g)?.join('-') || raw;
    setCode(fmt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 10) { setError('请输入有效的激活码'); return; }

    setIsVerifying(true);
    setError('');

    try {
      // 获取当前登录用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("登录已失效，请重新登录");

      // 🟢 调用后端 RPC 函数绑定激活码
      const { error: rpcError } = await supabase.rpc('activate_license', {
        p_code: code,
        p_user_id: user.id
      });

      if (rpcError) {
        console.error(rpcError);
        let msg = rpcError.message;
        if (msg.includes("violates") || msg.includes("not found")) {
            msg = "激活码无效或已被使用";
        }
        throw new Error(msg);
      }

      // 成功
      onSuccess(); // 通知父组件刷新状态
      onClose();
      
    } catch (err: any) {
      setError(err.message || '激活失败，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-8 relative border border-slate-100">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-300 hover:text-slate-500 transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800">绑定激活码</h3>
          <p className="text-sm text-slate-500 mt-1">请输入您购买的激活码以解锁云同步</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input 
              type="text" 
              value={code}
              onChange={handleCodeChange}
              className="w-full px-4 py-3 text-center text-lg font-mono border-2 border-amber-200 bg-amber-50/50 rounded-xl focus:border-amber-500 focus:ring-amber-500 outline-none uppercase tracking-widest text-slate-800 placeholder-amber-300 transition-colors"
              placeholder="XXXX-XXXX-XXXX"
              maxLength={19}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg text-center font-bold flex items-center justify-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isVerifying || code.length < 10}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
               <>
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 正在验证...
               </>
            ) : '立即绑定'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
             <a href="#" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">还没有激活码？联系管理员获取</a>
        </div>
      </div>
    </div>
  );
};