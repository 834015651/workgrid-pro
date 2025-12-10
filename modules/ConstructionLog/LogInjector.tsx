import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { LogService } from './LogService';

// ==========================================
// 1. 弹窗底部的状态栏 (保持不变)
// ==========================================
const LogStatusBar = ({ projectId, dateStr }: { projectId: string, dateStr: string }) => {
  const logs = LogService.getLogs(projectId);
  const hasLog = logs.some(l => l.date === dateStr);

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('WORKGRID_OPEN_LOG', { detail: { projectId, dateStr } }));
  };

  return (
    <div className="log-injector-container" style={{ padding: '0 24px 12px 24px', width: '100%', marginTop: '-8px' }}>
      <div 
        onClick={handleOpen}
        style={{
          backgroundColor: hasLog ? '#EFF6FF' : '#F8FAFC',
          border: hasLog ? '1px solid #BFDBFE' : '1px dashed #CBD5E1',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = hasLog ? '#DBEAFE' : '#F1F5F9';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = hasLog ? '#EFF6FF' : '#F8FAFC';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{hasLog ? '📝' : '📅'}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: hasLog ? '#1D4ED8' : '#64748B' }}>{hasLog ? '当日有施工日志' : '当日暂无施工日志'}</div>
            {hasLog && <div style={{ fontSize: '10px', color: '#3B82F6' }}>点击查看详情或编辑 &gt;</div>}
          </div>
        </div>
        {!hasLog && <button style={{ fontSize: '12px', color: '#4F46E5', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>+ 立即新建</button>}
      </div>
    </div>
  );
};

// ==========================================
// 2. 顶部导航栏按钮
// ==========================================
const HeaderButton = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button 
      onClick={() => {
        window.dispatchEvent(new CustomEvent('WORKGRID_OPEN_LOG', { detail: { mode: 'full' } }));
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        marginRight: '12px', // 右边距
        pointerEvents: 'auto', 
        cursor: 'pointer', 
        
        // 强制单行显示
        display: 'flex', 
        alignItems: 'center',
        flexDirection: 'row',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minWidth: 'max-content',
        
        height: '38px', // 高度与周围按钮对齐
        padding: '0 16px',
        borderRadius: '8px', 
        border: 'none',
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
        color: 'white',
        fontSize: '13px',
        fontWeight: 'bold',
        boxShadow: isHovered 
            ? '0 10px 15px -3px rgba(79, 70, 229, 0.4), 0 4px 6px -2px rgba(79, 70, 229, 0.2)' 
            : '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
        letterSpacing: '0.5px'
      }}
      title="进入施工日志全屏管理"
    >
      <span style={{ marginRight: '6px', fontSize: '15px', display: 'flex', alignItems: 'center' }}>📋</span>
      <span>施工日志</span>
      <span style={{ marginLeft: '6px', opacity: 0.9, fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: '4px', lineHeight: '1' }}>NEW</span>
    </button>
  );
};

export const LogInjector: React.FC = () => {
  useEffect(() => {
    
    // A. 注入弹窗 (逻辑不变)
    const injectModal = () => {
      const allElements = document.body.querySelectorAll('h3, div'); 
      let modalTitle: HTMLElement | null = null;
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        if (el.innerText && el.innerText.includes('考勤详情') && el.innerText.length < 30) { modalTitle = el; break; }
      }
      if (!modalTitle) return;

      let modalContainer = modalTitle.parentElement;
      let found = false;
      let depth = 0;
      while (modalContainer && depth < 6) {
        const style = window.getComputedStyle(modalContainer);
        if ((style.backgroundColor === 'rgb(255, 255, 255)' || modalContainer.className.includes('bg-white')) && style.position !== 'fixed') { found = true; break; }
        modalContainer = modalContainer.parentElement;
        depth++;
      }
      
      if (!found || !modalContainer || modalContainer.querySelector('.log-injector-container')) return;

      const dayMatch = modalTitle.innerText.match(/(\d+)\s*日/);
      const day = dayMatch ? parseInt(dayMatch[1]) : new Date().getDate();
      let currentYear = new Date().getFullYear();
      let currentMonth = new Date().getMonth() + 1;
      const bodyText = document.body.innerText;
      const dateMatch = bodyText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
      if (dateMatch) { currentYear = parseInt(dateMatch[1]); currentMonth = parseInt(dateMatch[2]); }
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      let projectId = 'default';
      try {
        const raw = localStorage.getItem('workgrid_projects');
        if (raw) {
          const projects = JSON.parse(raw);
          if (projects.length > 0) {
             const headerTitle = document.querySelector('header span.truncate')?.textContent?.trim();
             const matched = projects.find((p: any) => p.name === headerTitle);
             projectId = matched ? matched.id : projects[0].id;
          }
        }
      } catch (e) {}

      const injectContainer = document.createElement('div');
      const buttons = modalContainer.querySelectorAll('button');
      let footerDiv: HTMLElement | null = null;
      for(let i=0; i<buttons.length; i++) { if (buttons[i].innerText.includes('关闭')) { footerDiv = buttons[i].parentElement; break; } }
      
      if (footerDiv && footerDiv.parentElement === modalContainer) modalContainer.insertBefore(injectContainer, footerDiv);
      else modalContainer.appendChild(injectContainer);

      const root = ReactDOM.createRoot(injectContainer);
      root.render(<LogStatusBar projectId={projectId} dateStr={dateStr} />);
    };

    // 🟢 B. 注入顶部按钮 (核心修复：只在 <header> 里找)
    const injectHeader = () => {
        // 1. 先找到页面顶部的 <header> 标签
        const headerElement = document.querySelector('header');
        if (!headerElement) return;

        // 2. 防止重复注入
        if (headerElement.querySelector('#workgrid-log-header-btn-root')) return;

        // 3. 只在 header 内部寻找按钮
        const headerButtons = Array.from(headerElement.querySelectorAll('button'));
        let anchorButton: HTMLElement | null = null;

        for (const btn of headerButtons) {
            // 寻找包含 "云同步" 或 "登录" 的按钮
            if (btn.textContent && (btn.textContent.includes('同步') || btn.textContent.includes('登录'))) {
                anchorButton = btn;
                break;
            }
        }
        
        // 如果还没找到，找 "设置" 按钮做备选
        if (!anchorButton) {
            for (const btn of headerButtons) {
                if (btn.textContent && btn.textContent.includes('设置')) {
                    anchorButton = btn;
                    break;
                }
            }
        }

        // 4. 执行插入
        if (anchorButton && anchorButton.parentElement) {
            const container = document.createElement('div');
            container.id = 'workgrid-log-header-btn-root';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            
            anchorButton.parentElement.insertBefore(container, anchorButton);

            const root = ReactDOM.createRoot(container);
            root.render(<HeaderButton />);
        }
    };

    const timer = setInterval(() => {
        injectModal();
        injectHeader();
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return null;
};