import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 定义存储键名
const HISTORY_KEY = 'workgrid_login_history'; // 仅存邮箱列表
const CREDENTIALS_KEY = 'workgrid_saved_credentials'; // 存当前记住的账号密码

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🟢 新增：历史记录与下拉框状态
  const [historyEmails, setHistoryEmails] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  
  // 用于处理失去焦点的延迟
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🟢 初始化：加载历史数据
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      try {
        // 1. 读取历史邮箱列表
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        setHistoryEmails(hist);

        // 2. 读取“记住密码”的凭证
        const savedCreds = localStorage.getItem(CREDENTIALS_KEY);
        if (savedCreds) {
          const { email: sEmail, password: sPassword } = JSON.parse(savedCreds);
          setEmail(sEmail);
          setPassword(sPassword);
          setRememberPassword(true); // 自动勾选
        } else if (hist.length > 0) {
          // 如果没记住密码，默认填入最近一次使用的邮箱
          setEmail(hist[0]);
          setPassword('');
          setRememberPassword(false);
        }
      } catch (e) {
        console.error("读取本地缓存失败", e);
      }
    }
  }, [isOpen]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.startsWith('VIP')) {
        if (val.length > 15) val = val.slice(0, 15);
        let formatted = val.slice(0, 3);
        if (val.length > 3) formatted += '-' + val.slice(3, 7);
        if (val.length > 7) formatted += '-' + val.slice(7, 11);
        if (val.length > 11) formatted += '-' + val.slice(11, 15);
        if (formatted.endsWith('-')) formatted = formatted.slice(0, -1);
        setLicenseCode(formatted);
    } else {
        if (val.length > 16) val = val.slice(0, 16);
        const parts = val.match(/.{1,4}/g);
        setLicenseCode(parts ? parts.join('-') : val);
    }
  };

  // 🟢 核心：更新历史记录和凭证
  const updateHistoryAndCredentials = () => {
    // 1. 更新历史列表 (去重，最新的放最前，只保留3个)
    const newHistory = [email, ...historyEmails.filter(e => e !== email)].slice(0, 3);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    setHistoryEmails(newHistory);

    // 2. 处理记住密码
    if (rememberPassword) {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem(CREDENTIALS_KEY);
    }
  };

// 🟢 1. 新增：错误信息翻译函数
  const getChineseError = (msg: string) => {
    if (!msg) return '未知错误';
    const m = msg.toLowerCase();
    
    // 网络与跨域错误
    if (m.includes('failed to fetch') || m.includes('load failed')) return '连接服务器失败，请检查网络或跨域配置';
    if (m.includes('network request failed')) return '网络连接异常';
    
    // 登录错误
    if (m.includes('invalid login credentials')) return '账号或密码错误';
    
    // 注册错误
    if (m.includes('user already registered') || m.includes('already registered')) return '该邮箱已被注册';
    if (m.includes('password should be')) return '密码长度不足 (至少6位)';
    if (m.includes('weak password')) return '密码过于简单';
    
    // 激活错误
    if (m.includes('violates row-level security')) return '激活码无效或权限不足';
    if (m.includes('unique constraint')) return '激活码已被其他账号使用';
    if (m.includes('activation code not found')) return '激活码不存在';
    
    // 其他
    if (m.includes('rate limit')) return '操作太频繁，请稍后再试';
    
    return `发生错误: ${msg}`; // 未收录的错误显示原话
  };

  // 🟢 2. 修改后的提交函数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        // --- 登录逻辑 ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        updateHistoryAndCredentials(); // 保存记录
        onClose();
      } else {
        // --- 注册并激活逻辑 ---
        if (licenseCode.length < 10) throw new Error("请输入有效的激活码");

        // 1. 先注册账号
        const { data: authData, error: signError } = await supabase.auth.signUp({ email, password });
        if (signError) throw signError;
        if (!authData.user) throw new Error("注册失败，无法创建用户");

        // 2. 绑定激活码 (保持你刚才的修改：不去掉横杠)
        const { error: rpcError } = await supabase.rpc('activate_license', { 
            p_code: licenseCode, 
            p_user_id: authData.user.id 
        });

        // 3. 错误处理
        if (rpcError) {
            console.error("激活失败详细信息:", rpcError);
            // 抛出错误，让下面的 catch 捕获并翻译
            throw new Error(rpcError.message || "激活码无效或已被使用");
        }

        // 4. 成功逻辑
        alert("注册成功！");
        
        // 保存邮箱历史
        const newHistory = [email, ...historyEmails.filter(e => e !== email)].slice(0, 3);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

        if (authData.session) {
            onClose();
        } else { 
            setIsLogin(true); 
            // 这里不用报错，用绿色提示或者普通的 setErrorMsg 提示下一步
            setErrorMsg("注册成功，请登录"); 
        }
      }
    } catch (err: any) { 
      console.error(err);
      // 🟢 3. 核心修改：调用翻译函数
      setErrorMsg(getChineseError(err.message || '')); 
    } finally { 
      setLoading(false); 
    }
  };

  // 🟢 交互：输入框获得焦点
  const handleEmailFocus = () => {
    if (historyEmails.length > 0) setShowDropdown(true);
  };

  // 🟢 交互：输入框失去焦点 (延迟，否则点不到下拉项)
  const handleEmailBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  // 🟢 交互：选择历史账号
  const selectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    
    // 检查这个选中的邮箱是不是正好是那个“记住密码”的账号
    const savedCreds = localStorage.getItem(CREDENTIALS_KEY);
    if (savedCreds) {
      const { email: sEmail, password: sPassword } = JSON.parse(savedCreds);
      if (sEmail === selectedEmail) {
        setPassword(sPassword);
        setRememberPassword(true);
      } else {
        setPassword(''); 
        setRememberPassword(false);
      }
    } else {
      setPassword('');
      setRememberPassword(false);
    }
    setShowDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div id="legitimate-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-8 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-300 hover:text-slate-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-slate-800">{isLogin ? '账号登录' : '激活并注册'}</h3>
          <p className="text-sm text-slate-500 mt-2">
            {isLogin ? '登录后即可同步云端数据' : '新用户需验证激活码'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          {/* 🟢 邮箱输入区域 (带下拉框) */}
          <div className="relative">
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
              className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors relative z-10" 
              placeholder="请输入邮箱" 
              autoComplete="username"
            />
            
            {/* 下拉菜单 */}
            {showDropdown && historyEmails.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 font-bold">最近登录</div>
                {historyEmails.map((histEmail) => (
                  <div 
                    key={histEmail}
                    onClick={() => selectEmail(histEmail)}
                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    {histEmail}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="设置密码 (至少6位)" autoComplete="current-password" />
          </div>

          {/* 🟢 记住密码选项 */}
          {isLogin && (
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors">
                <input 
                  type="checkbox" 
                  checked={rememberPassword} 
                  onChange={e => setRememberPassword(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                记住密码 (自动填充)
              </label>
            </div>
          )}

          {!isLogin && <div><input type="text" required value={licenseCode} onChange={handleCodeChange} className="w-full px-4 py-3 text-center font-mono text-sm border-2 border-amber-200 bg-amber-50 rounded-xl focus:border-amber-500 outline-none" placeholder="输入激活码" maxLength={19} /></div>}
          
          {errorMsg && <div className="p-2 bg-red-50 text-red-600 text-xs rounded text-center font-bold">{errorMsg}</div>}
          
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70 flex justify-center">
            {loading ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (isLogin ? '立即登录' : '验证激活')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} className="text-sm text-blue-600 font-medium hover:underline">
            {isLogin ? '我是新用户，去激活注册' : '已有账号，去登录'}
          </button>
        </div>
      </div>
    </div>
  );
};