import { useState, useRef } from 'react';
import { exportToFile, exportToText, importFromFile, importFromText, generateQRData, recordBackup } from '../utils/dataSync';
import { QRCodeSVG } from 'qrcode.react';
import './DataManager.css';

interface DataManagerProps {
  onDataChanged: () => void;
}

export default function DataManager({ onDataChanged }: DataManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleExportFile = () => {
    exportToFile();
    recordBackup();
    showMessage('success', '数据已导出到文件！');
  };

  const handleExportText = () => {
    const text = exportToText();
    if (textAreaRef.current) {
      textAreaRef.current.value = text;
      textAreaRef.current.select();
      navigator.clipboard.writeText(text);
      showMessage('success', '数据已复制到剪贴板！可以粘贴发送到其他设备。');
    }
  };

  const handleGenerateQR = () => {
    const data = generateQRData();
    if (data.length > 2000) {
      showMessage('error', '数据量太大，无法生成二维码。请使用文件导出或删除一些已完成的事件。');
      return;
    }
    setQrCodeData(data);
    setShowQR(true);
  };

  const handleImportFile = async () => {
    if (fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      const result = await importFromFile(file, importMode);
      
      if (result.success) {
        showMessage('success', result.message);
        onDataChanged();
        setTimeout(() => {
          setShowModal(false);
        }, 1500);
      } else {
        showMessage('error', result.message);
      }
      
      // 重置文件选择
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportText = () => {
    const text = textAreaRef.current?.value;
    if (!text) {
      showMessage('error', '请粘贴数据');
      return;
    }

    const result = importFromText(text, importMode);
    if (result.success) {
      showMessage('success', result.message);
      onDataChanged();
      setTimeout(() => {
        setShowModal(false);
      }, 1500);
    } else {
      showMessage('error', result.message);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <>
      <button className="btn-data-manager" onClick={() => setShowModal(true)} title="数据导出/导入">
        📁 数据管理
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="data-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>数据管理</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                onClick={() => setActiveTab('export')}
              >
                📤 导出数据
              </button>
              <button
                className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
                onClick={() => setActiveTab('import')}
              >
                📥 导入数据
              </button>
            </div>

            {message && (
              <div className={`message ${message.type}`}>
                {message.type === 'success' ? '✓' : '✗'} {message.text}
              </div>
            )}

            <div className="modal-content">
              {activeTab === 'export' ? (
                <div className="export-section">
                  <div className="option-card">
                    <div className="option-icon">💾</div>
                    <div className="option-content">
                      <h3>导出为文件</h3>
                      <p>下载 JSON 文件，可保存到电脑或发送到其他设备</p>
                      <button className="btn-primary" onClick={handleExportFile}>
                        下载文件
                      </button>
                    </div>
                  </div>

                  <div className="option-card">
                    <div className="option-icon">📋</div>
                    <div className="option-content">
                      <h3>复制数据</h3>
                      <p>复制数据文本，通过微信等发送到其他设备</p>
                      <button className="btn-primary" onClick={handleExportText}>
                        复制到剪贴板
                      </button>
                      <textarea
                        ref={textAreaRef}
                        className="data-textarea"
                        placeholder="数据将显示在这里..."
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="option-card">
                    <div className="option-icon">📱</div>
                    <div className="option-content">
                      <h3>生成二维码</h3>
                      <p>在其他设备上扫描二维码导入数据（仅未完成事件）</p>
                      <button className="btn-primary" onClick={handleGenerateQR}>
                        生成二维码
                      </button>
                      {showQR && qrCodeData && (
                        <div className="qr-code-container">
                          <QRCodeSVG
                            value={qrCodeData}
                            size={256}
                            level="M"
                            includeMargin={true}
                          />
                          <p className="qr-note">使用手机扫描二维码导入数据</p>
                          <p className="qr-note-small">数据大小：{qrCodeData.length} 字符</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="import-section">
                  <div className="import-mode">
                    <label>导入模式：</label>
                    <div className="mode-options">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                        />
                        <span>合并（保留现有数据，添加新数据）</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>替换（清空现有数据）</span>
                      </label>
                    </div>
                  </div>

                  <div className="option-card">
                    <div className="option-icon">📂</div>
                    <div className="option-content">
                      <h3>从文件导入</h3>
                      <p>选择之前导出的 JSON 文件</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="file-input"
                      />
                      <button
                        className="btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        选择文件
                      </button>
                    </div>
                  </div>

                  <div className="option-card">
                    <div className="option-content">
                      <h3>粘贴数据导入</h3>
                      <p>粘贴从其他设备复制的数据文本</p>
                      <textarea
                        ref={textAreaRef}
                        className="data-textarea"
                        placeholder="在这里粘贴数据..."
                      />
                      <button className="btn-primary" onClick={handleImportText}>
                        导入数据
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


