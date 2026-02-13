'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export interface SwaggerDocsProps {
  specUrl: string;
  title?: string;
  homeUrl?: string;
  loginUrl?: string;
  badgeText?: string;
}

export function SwaggerDocs({
  specUrl,
  title = 'API Documentation',
  homeUrl = '/',
  loginUrl,
  badgeText = 'API Documentation',
}: SwaggerDocsProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('swagger-theme');
    if (stored) {
      setIsDark(stored === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('swagger-theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'swagger-dark' : 'swagger-light'}`} data-theme={isDark ? 'dark' : 'light'}>
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <a href={homeUrl} className="btn btn-ghost text-xl">{title}</a>
          <span className="badge badge-primary ml-2">{badgeText}</span>
        </div>
        <div className="flex-none gap-2">
          <button onClick={toggleTheme} className="btn btn-sm btn-ghost">
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          {loginUrl && (
            <a href={loginUrl} className="btn btn-sm btn-outline">Login</a>
          )}
        </div>
      </div>
      <div className="swagger-wrapper">
        <SwaggerUI url={specUrl} />
      </div>
      <style jsx global>{`
        .swagger-wrapper {
          padding: 1rem;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: bold;
        }
        .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid #ddd;
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }
        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }
        .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.1);
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.1);
        }
        .swagger-ui .btn.execute {
          background-color: #4096ff;
          border-color: #4096ff;
        }
        .swagger-ui .btn.authorize {
          background-color: #49cc90;
          border-color: #49cc90;
          color: white;
        }
        .swagger-ui .response-col_status {
          font-weight: bold;
        }

        /* Light theme */
        .swagger-light {
          background: #fafafa;
        }
        .swagger-light .navbar {
          background: #f5f5f5;
          color: #333;
        }

        /* Dark theme */
        .swagger-dark {
          background: #1a1a2e;
        }
        .swagger-dark .navbar {
          background: #16213e !important;
          color: #eee;
        }
        .swagger-dark .swagger-ui,
        .swagger-dark .swagger-ui .info .title,
        .swagger-dark .swagger-ui .info .base-url,
        .swagger-dark .swagger-ui .info p,
        .swagger-dark .swagger-ui .info li,
        .swagger-dark .swagger-ui .opblock-tag,
        .swagger-dark .swagger-ui .opblock .opblock-summary-description,
        .swagger-dark .swagger-ui .opblock .opblock-summary-operation-id,
        .swagger-dark .swagger-ui .opblock .opblock-summary-path,
        .swagger-dark .swagger-ui .opblock .opblock-summary-path__deprecated,
        .swagger-dark .swagger-ui .tab li,
        .swagger-dark .swagger-ui .response-col_status,
        .swagger-dark .swagger-ui .response-col_description,
        .swagger-dark .swagger-ui table thead tr th,
        .swagger-dark .swagger-ui table tbody tr td,
        .swagger-dark .swagger-ui .parameter__name,
        .swagger-dark .swagger-ui .parameter__type,
        .swagger-dark .swagger-ui .parameter__deprecated,
        .swagger-dark .swagger-ui .parameter__in,
        .swagger-dark .swagger-ui .model-title,
        .swagger-dark .swagger-ui .model,
        .swagger-dark .swagger-ui section.models h4,
        .swagger-dark .swagger-ui .servers > label,
        .swagger-dark .swagger-ui .operation-filter-input {
          color: #e0e0e0 !important;
        }
        .swagger-dark .swagger-ui .opblock .opblock-section-header {
          background: rgba(0,0,0,0.3);
        }
        .swagger-dark .swagger-ui .opblock .opblock-section-header h4 {
          color: #fff !important;
        }
        .swagger-dark .swagger-ui .opblock-body pre.microlight {
          background: #0d1117 !important;
          color: #c9d1d9 !important;
        }
        .swagger-dark .swagger-ui textarea,
        .swagger-dark .swagger-ui input[type="text"],
        .swagger-dark .swagger-ui input[type="password"],
        .swagger-dark .swagger-ui input[type="email"] {
          background: #2d2d44;
          color: #e0e0e0;
          border-color: #444;
        }
        .swagger-dark .swagger-ui select {
          background: #2d2d44;
          color: #e0e0e0;
          border-color: #444;
        }
        .swagger-dark .swagger-ui .opblock-tag {
          border-color: #444;
        }
        .swagger-dark .swagger-ui section.models {
          border-color: #444;
        }
        .swagger-dark .swagger-ui section.models.is-open h4 {
          border-color: #444;
        }
        .swagger-dark .swagger-ui .model-box {
          background: rgba(0,0,0,0.2);
        }
        .swagger-dark .swagger-ui .prop-type {
          color: #86e1fc !important;
        }
        .swagger-dark .swagger-ui .prop-format {
          color: #a78bfa !important;
        }
      `}</style>
    </div>
  );
}
