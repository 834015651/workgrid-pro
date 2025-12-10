import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConstructionLogWidget } from './Widget';
import { LogInjector } from './LogInjector'; // 🟢 1. 确保引入了这个文件

// 创建独立容器
const mountId = 'workgrid-construction-log-root';
let container = document.getElementById(mountId);

if (!container) {
  container = document.createElement('div');
  container.id = mountId;
  document.body.appendChild(container);
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    {/* 悬浮球组件 (你现在已经有这个了) */}
    <ConstructionLogWidget />
    
    {/* 👇👇👇 你之前肯定漏了这一行！没有它，就不会注入弹窗！ 👇👇👇 */}
    <LogInjector /> 
  </React.StrictMode>
);