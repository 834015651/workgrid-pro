
import React, { useState, useEffect } from 'react';
import { useWorkGridLogic } from './hooks/useWorkGridLogic';
import { DesktopLayout } from './components/DesktopLayout';
import { MobileLayout } from './components/MobileLayout';
import './modules/ConstructionLog/install';

// 简单的自定义 Hook 检测是否为移动端
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const App = () => {
  const logic = useWorkGridLogic();
  const isMobile = useIsMobile();
  
  // 🟢 新增：防止 iOS PWA 启动时因为没有 session 导致子组件崩溃
  // 如果你需要强制登录才能用，可以在这里拦截：
  /* if (!logic.session && !logic.isActivated) {
     // 这里可以返回一个 Loading 或者是登录页
     // return <LoginScreen /> 
  }
  */

  // 这里的关键是：MobileLayout 内部必须能处理 logic.session 为 null 的情况
  // 如果 MobileLayout 里写了 logic.session.user.email 这种代码，下面这行就会白屏
  try {
    return isMobile ? <MobileLayout logic={logic} /> : <DesktopLayout logic={logic} />;
  } catch (e) {
    return <div className="p-10 text-center">系统加载中，请刷新...</div>;
  }
};
export default App;
