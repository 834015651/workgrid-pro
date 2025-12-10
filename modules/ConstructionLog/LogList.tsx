// src/modules/ConstructionLog/install.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConstructionLogWidget } from './Widget';
import { LogInjector } from './LogInjector'; // 🟢 1. 必须引入这个文件

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
    {/* 悬浮球组件 */}
    <ConstructionLogWidget />
    
    {/* 🟢 2. 必须把这个侦探组件放进去，它才会开始工作！ */}
    <LogInjector /> 
  </React.StrictMode>
);