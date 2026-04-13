import React, { useState, useEffect } from 'react';
import {
  Camera, UploadCloud, X, Activity, Sparkles,
  CheckCircle2, Database, Image as ImageIcon, MessageSquare,
  PieChart as PieChartIcon, HeartPulse, Zap, Info, TrendingUp, ScanLine, AlertTriangle, Flag, Send
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Radar as RechartsRadar
} from 'recharts';

// 🔽 前端圖片壓縮引擎
const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("圖片壓縮失敗"));
            return;
          }
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error("圖片載入失敗"));
    };
    reader.onerror = (error) => reject(error);
  });
};

const Diet = ({ apiFetch, showNotification }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [records, setRecords] = useState([]);

  // 詳情彈窗/右側面板相關 State
  const [selectedChatRecord, setSelectedChatRecord] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [recordImageBase64, setRecordImageBase64] = useState(null);
  const [imageFetchStatus, setImageFetchStatus] = useState('idle');

  // 補充細節用的 State
  const [complementText, setComplementText] = useState('');

  // 回報問題狀態
  const [reportingId, setReportingId] = useState(null);

  // 測試圖片預覽 State
  const [showTestPreview, setShowTestPreview] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await apiFetch('/diet_record', { method: 'GET' });
      if (Array.isArray(data)) setRecords(data);
    } catch (err) {
      console.error("無法取得歷史紀錄", err);
    }
  };

  const prepareTestImage = () => {
    setPreviewUrl('/test1.jpg');
    setShowTestPreview(true);
    setResult(null);
  };

  const executeTestImageAnalysis = async () => {
    setIsAnalyzing(true);
    setShowTestPreview(false);
    try {
      const response = await fetch('/test1.jpg');
      const blob = await response.blob();
      const file = new File([blob], "test1.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append('image', file);
      const data = await apiFetch('/diet', { method: 'POST', body: formData });
      setResult(data);
      showNotification('測試圖片分析完成！');
      fetchHistory();
    } catch (err) {
      showNotification('測試圖片分析失敗', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setShowTestPreview(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const compressedBlob = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('image', compressedBlob, 'upload.jpg');
      const data = await apiFetch('/diet', { method: 'POST', body: formData });
      setResult(data);
      showNotification('分析完成！');
      fetchHistory();
    } catch (err) {
      showNotification(err.message || '圖片分析失敗，請重試', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecordSelect = (rec) => {
    setSelectedChatRecord(rec);
    setActiveTab('analysis');
    setRecordImageBase64(null);
    setImageFetchStatus('idle');
    setComplementText(''); // 清空輸入框
    if (window.innerWidth < 768) {
      setShowMobileDetail(true);
    }
  };

  const handleTabSwitch = async (tab) => {
    setActiveTab(tab);
    if (tab === 'image' && imageFetchStatus === 'idle' && selectedChatRecord?.id) {
      setImageFetchStatus('loading');
      try {
        const res = await apiFetch(`/diet_image`, {
          method: 'POST',
          body: JSON.stringify({ record_id: selectedChatRecord.id })
        });
        if (res.image_base64) {
          setRecordImageBase64(res.image_base64);
          setImageFetchStatus('success');
        } else {
          setImageFetchStatus('error');
        }
      } catch (e) {
        console.error('Failed to fetch image:', e);
        setImageFetchStatus('error');
      }
    }
  };

  // 提交補充細節的邏輯 (未來預留)
  const handleComplementSubmit = async (e) => {
    e.preventDefault();
    if (!complementText.trim()) return;

    // 這裡以後可以接 API 更新該筆紀錄
    showNotification(`已收到補充：${complementText}。功能開發中！`);
    setComplementText('');
  };

  const getRadarData = (rec) => [
    { subject: '穀物', A: rec.grain_area || 0 },
    { subject: '肉蛋', A: rec.protein_meat_area || 0 },
    { subject: '蔬菜', A: rec.vegetable_area || 0 },
    { subject: '水果', A: rec.fruit_area || 0 },
    { subject: '乳品', A: rec.dairy_area || 0 },
    { subject: '油脂', A: rec.nuts_area || 0 },
  ];

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setShowTestPreview(false);
    setReportingId(null);
  };

  const renderRecordDetails = () => (
    <div className="flex flex-col h-full">
      {/* Tabs 切換按鈕 */}
      <div className="flex gap-3 mb-6 shrink-0">
        <button
          onClick={() => handleTabSwitch('analysis')}
          className={`flex-1 py-2.5 rounded-xl border-4 font-black transition-colors ${activeTab === 'analysis' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
        >
          分析結果
        </button>
        <button
          onClick={() => handleTabSwitch('image')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-4 font-black transition-colors ${activeTab === 'image' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
        >
          <ImageIcon size={18} /> 照片紀錄
        </button>
      </div>

      {/* 內容區塊 */}
      <div className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-thin scrollbar-thumb-slate-200">
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] rounded-tr-none shadow-sm border-4 border-indigo-100">
              <h4 className="font-black text-slate-700 mb-6 flex items-center gap-2 text-lg">
                <TrendingUp size={20} className="text-indigo-500" /> 營養組成雷達圖
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedChatRecord)}>
                    <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 800, fill: '#475569' }} />
                    <RechartsRadar name="餐點比例" dataKey="A" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg border-2 border-emerald-400 shrink-0"><Sparkles size={20} /></div>
              <div className="bg-emerald-600 text-white p-5 rounded-[32px] rounded-tl-none shadow-md border-4 border-emerald-500 w-full">
                <p className="text-xs font-black opacity-80 mb-3 border-b border-emerald-400 pb-2">AI 智慧營養師點評</p>
                <p className="text-base font-bold leading-relaxed italic">"{selectedChatRecord.ai_evaluation}"</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-[32px] border-4 border-slate-100 p-4 animate-in fade-in">
            {imageFetchStatus === 'loading' && <Activity size={40} className="animate-spin text-emerald-500" />}
            {imageFetchStatus === 'success' && recordImageBase64 && (
              <img src={`data:image/jpeg;base64,${recordImageBase64}`} className="w-full h-auto rounded-2xl border-4 border-emerald-100 object-contain max-h-[50vh]" />
            )}
          </div>
        )}
      </div>

      {/* 🔽 新增：補充細節輸入框 */}
      {activeTab === 'analysis' && (
        <form onSubmit={handleComplementSubmit} className="mt-auto pt-4 border-t-4 border-slate-100">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={complementText}
              onChange={(e) => setComplementText(e.target.value)}
              placeholder="補充食物細節 (例：還有半碗白飯...)"
              className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={!complementText.trim()}
              className="bg-emerald-600 text-white p-3 rounded-xl border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24" onClick={() => setReportingId(null)}>
      {/* --- 上部：辨識區 --- */}
      <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border-2 border-slate-100 transition-all">
        <div className="flex items-center mb-8 border-b-2 border-slate-50 pb-6">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mr-4 border-2 border-blue-200"><Camera size={24} /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">飲食 YOLO 視覺辨識</h2>
            <p className="text-slate-500 text-sm font-bold">即時標註食物組件並產出營養分析</p>
          </div>
        </div>

        <div className="mb-6 space-y-6">
          {previewUrl ? (
            <div className={`relative border-4 rounded-[32px] p-6 shadow-sm overflow-hidden transition-all duration-500 ${result ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
              {showTestPreview && !result && (
                <div className="mb-6 bg-amber-50 border-4 border-amber-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-amber-700 animate-in slide-in-from-top-4">
                  <Info size={24} className="animate-pulse" />
                  <span className="font-black text-lg">即將使用測試照片</span>
                </div>
              )}
              <img
                src={result?.image_base64 ? `data:image/jpeg;base64,${result.image_base64}` : previewUrl}
                alt="Food Detection"
                className="mx-auto max-h-80 rounded-2xl object-contain shadow-md border-4 border-white"
              />
              {result?.image_base64 && (
                <div className="absolute top-6 left-6 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-500 border-2 border-emerald-400">
                  <ScanLine size={16} className="animate-pulse" /> AI 標註完成
                </div>
              )}
              <button onClick={clearSelection} className="absolute top-6 right-6 bg-white p-2 rounded-full shadow-md text-red-500 border-4 border-red-50 hover:bg-red-50 hover:scale-110 transition-all">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="border-4 border-dashed border-slate-200 rounded-[32px] p-10 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="bg-blue-50 p-6 rounded-full mb-6 inline-block border-4 border-blue-100"><UploadCloud size={48} className="text-blue-500" /></div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => document.getElementById('fileUpload').click()} className="bg-white border-4 border-slate-200 py-3 px-6 rounded-xl font-black flex items-center justify-center hover:bg-slate-50 transition shadow-sm text-slate-700">
                  <ImageIcon size={20} className="mr-2 text-slate-500" /> 相簿選擇
                </button>
                <input type="file" id="fileUpload" className="hidden" accept="image/*" onChange={handleFileChange} />
                <button onClick={prepareTestImage} disabled={isAnalyzing} className="bg-emerald-600 border-4 border-emerald-700 text-white py-3 px-6 rounded-xl font-black flex items-center justify-center hover:bg-emerald-700 transition shadow-sm">
                  <Zap size={20} className="mr-2" /> 測試圖片
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
              <div className="bg-emerald-50 rounded-[32px] p-6 border-4 border-emerald-200 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className="bg-emerald-600 text-white px-5 py-2 rounded-2xl border-4 border-emerald-500 shadow-md">
                      <p className="text-[10px] font-black opacity-80 uppercase">AI Score</p>
                      <p className="text-3xl font-black">{result.ai_health_score || '--'}</p>
                    </div>
                    <div>
                      <h3 className="font-black text-emerald-800 text-lg flex items-center gap-2">辨識成功 <CheckCircle2 size={18} /></h3>
                      <p className="text-sm font-bold text-emerald-600">總熱量: {result.total_calories?.toFixed(0)} kcal</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportingId(reportingId === 'current' ? null : 'current');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-black text-xs transition-all ${reportingId === 'current' ? 'bg-rose-500 border-rose-600 text-white shadow-lg' : 'bg-white border-emerald-200 text-emerald-500 hover:text-rose-500 hover:border-rose-300'}`}
                    >
                      <Flag size={14} fill={reportingId === 'current' ? "currentColor" : "none"} /> 回報
                    </button>
                    {reportingId === 'current' && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white border-4 border-slate-900 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-2 bg-slate-900 text-white text-[10px] font-black text-center uppercase">錯誤類型</div>
                        {['圖片無法載入', '圖片顯示錯誤', 'AI判讀有誤', '熱量辨別有誤'].map((opt) => (
                          <button key={opt} onClick={() => { setReportingId(null); alert('感謝回報！'); }} className="w-full px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-left border-b last:border-none border-slate-100">{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border-2 border-emerald-100 relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-emerald-700 font-black text-sm"><Sparkles size={16} /> AI 營養師建議</div>
                  <p className="text-emerald-900 font-bold leading-relaxed italic text-sm">"{result.ai_comment}"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!result && previewUrl && (
          <button
            onClick={showTestPreview ? executeTestImageAnalysis : handleUpload}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
          >
            {isAnalyzing ? <Activity className="animate-spin mr-3" /> : <Sparkles className="mr-3" />}
            {isAnalyzing ? '推論中...' : '開始辨識'}
          </button>
        )}
      </div>

      {/* --- 下部：歷史紀錄 --- */}
      <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden flex flex-col h-[600px] md:h-[750px]">
        <div className="p-5 border-b-4 border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-600" />
            <h3 className="font-black text-slate-800">歷史辨識分析對話</h3>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-full md:w-1/3 border-r-4 border-slate-100 overflow-y-auto bg-slate-50/30">
            {records.map((rec, idx) => (
              <div
                key={rec.id || idx}
                onClick={() => handleRecordSelect(rec)}
                className={`p-5 border-b-2 border-slate-100 cursor-pointer transition-all ${selectedChatRecord?.id === rec.id ? 'bg-white border-l-8 border-l-indigo-500' : 'hover:bg-white'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-400">{rec.created_at?.split('.')[0]}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Score: {rec.ai_score}</span>
                </div>
                <p className="text-sm font-black text-slate-700 truncate">熱量: {rec.total_calories?.toFixed(0)} kcal</p>
              </div>
            ))}
          </div>
          <div className="hidden md:flex flex-1 p-8 bg-slate-50/50 flex-col overflow-hidden">
            {selectedChatRecord ? renderRecordDetails() : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Info size={48} className="mb-4 opacity-20" />
                <p className="font-black">點擊左側紀錄查看詳情</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 手機版彈窗 */}
      {showMobileDetail && selectedChatRecord && (
        <div className="fixed inset-0 z-[100] md:hidden flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-[90vh] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col">
            <div className="p-4 flex justify-center border-b-4 border-slate-100 shrink-0 relative">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
              <button onClick={() => setShowMobileDetail(false)} className="absolute right-6 top-2 text-slate-500"><X size={24} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col">
              {renderRecordDetails()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diet;
