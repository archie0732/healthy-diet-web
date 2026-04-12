import React, { useState, useEffect } from 'react';
import {
  Camera, UploadCloud, X, Activity, Sparkles,
  CheckCircle2, Database, Image as ImageIcon, MessageSquare,
  PieChart as PieChartIcon, HeartPulse, Zap, Info, TrendingUp, ScanLine, AlertTriangle
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';

// 🔽 魔法 1：前端圖片壓縮引擎 (限制最大尺寸 1024px，品質 0.8)
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

        // 🚨 關鍵修改：直接回傳 Blob，不要在前端包裝成 File
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
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'image'
  const [recordImageBase64, setRecordImageBase64] = useState(null);
  const [imageFetchStatus, setImageFetchStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

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

  // 準備使用測試圖片 (顯示預覽)
  const prepareTestImage = () => {
    setPreviewUrl('/test1.jpg');
    setShowTestPreview(true);
    setResult(null);
  };

  // 實際執行測試圖片分析
  const executeTestImageAnalysis = async () => {
    setIsAnalyzing(true);
    setShowTestPreview(false); // 隱藏預覽卡片，進入分析狀態
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
      setShowTestPreview(false); // 若選擇新檔案，隱藏測試預覽
    }
  };

  // 🔽 魔法 2：上傳前先經過壓縮引擎處理
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);

    try {
      const compressedBlob = await compressImage(selectedFile);
      const formData = new FormData();

      // 🚨 關鍵修改：手動強制把檔名命名為 "upload.jpg"
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
    setActiveTab('analysis'); // 每次選擇新紀錄時重置為分析結果
    setRecordImageBase64(null);
    setImageFetchStatus('idle');
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
  };

  // 渲染歷史紀錄詳細資料 (供電腦版和手機版共用)
  const renderRecordDetails = () => (
    <div className="flex flex-col h-full space-y-6">
      {/* Tabs 切換按鈕 */}
      <div className="flex gap-3 mb-2">
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
      {activeTab === 'analysis' && (
        <div className="space-y-6 overflow-y-auto pr-2 pb-8 scrollbar-thin scrollbar-thumb-slate-200">
          <div className="self-end w-full animate-in slide-in-from-right-4">
            <div className="bg-white p-6 rounded-[32px] rounded-tr-none shadow-sm border-4 border-indigo-100">
              <h4 className="font-black text-slate-700 mb-6 flex items-center gap-2 text-lg">
                <TrendingUp size={20} className="text-indigo-500" /> 營養組成雷達圖分析
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedChatRecord)}>
                    <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 800, fill: '#475569' }} />
                    <Radar name="餐點比例" dataKey="A" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="self-start w-full animate-in slide-in-from-left-4">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg border-2 border-emerald-400 shrink-0"><Sparkles size={20} /></div>
              <div className="bg-emerald-600 text-white p-5 rounded-[32px] rounded-tl-none shadow-md border-4 border-emerald-500 w-full">
                <p className="text-xs font-black opacity-80 mb-3 border-b border-emerald-400 pb-2">AI 智慧營養師點評</p>
                <p className="text-base font-bold leading-relaxed italic">"{selectedChatRecord.ai_evaluation}"</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 mb-1">預估總熱量</p>
              <p className="text-lg font-black text-slate-800">{selectedChatRecord.total_calories?.toFixed(0)} kcal</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border-4 border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 mb-1">分析狀態</p>
              <p className="text-lg font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} strokeWidth={3} /> 成功</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'image' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-[32px] border-4 border-slate-100 p-4 animate-in fade-in">
          {imageFetchStatus === 'loading' && (
            <div className="flex flex-col items-center text-emerald-500">
              <Activity size={40} className="animate-spin mb-2" />
              <p className="font-black text-sm">正在載入分析照片...</p>
            </div>
          )}
          {imageFetchStatus === 'error' && (
            <div className="flex flex-col items-center text-rose-500">
              <AlertTriangle size={48} className="mb-3 opacity-50" />
              <p className="font-black text-sm text-slate-500">無法載入，圖片可能已遺失</p>
            </div>
          )}
          {imageFetchStatus === 'success' && recordImageBase64 && (
            <img
              src={`data:image/jpeg;base64,${recordImageBase64}`}
              alt="Diet Record Analysis"
              className="w-full h-auto rounded-2xl border-4 border-emerald-100 object-contain max-h-[50vh]"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* --- 上部：辨識區 --- */}
      <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border-2 border-slate-100 transition-all">
        <div className="flex items-center mb-8 border-b-2 border-slate-50 pb-6">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mr-4 border-2 border-blue-200"><Camera size={24} /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">飲食 YOLO 視覺辨識</h2>
            <p className="text-slate-500 text-sm font-bold">上傳照片，AI 將自動框選食物並計算熱量</p>
          </div>
        </div>

        <div className="mb-6 space-y-6">
          {previewUrl ? (
            <div className={`relative border-4 rounded-[32px] p-6 shadow-sm overflow-hidden transition-all duration-500 ${result ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>

              {/* 測試預覽狀態提示 */}
              {showTestPreview && !result && (
                <div className="mb-6 bg-amber-50 border-4 border-amber-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-amber-700 animate-in slide-in-from-top-4">
                  <Info size={24} className="animate-pulse" />
                  <span className="font-black text-lg">即將使用此照片進行測試</span>
                </div>
              )}

              <img
                src={result?.image_base64 ? `data:image/jpeg;base64,${result.image_base64}` : previewUrl}
                alt="Food Detection"
                className="mx-auto max-h-80 rounded-2xl object-contain shadow-md border-4 border-white"
              />

              {result?.image_base64 && (
                <div className="absolute top-6 left-6 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-500 border-2 border-emerald-400">
                  <ScanLine size={16} className="animate-pulse" /> AI 視覺標註完成
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
                <button onClick={prepareTestImage} disabled={isAnalyzing} className="bg-emerald-600 border-4 border-emerald-700 text-white py-3 px-6 rounded-xl font-black flex items-center justify-center hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                  <Zap size={20} className="mr-2" /> 載入測試圖片
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 rounded-[32px] p-6 sm:p-8 border-4 border-emerald-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
              <div className="flex justify-between items-center mb-6 border-b-4 border-emerald-100 pb-4">
                <h3 className="text-lg sm:text-xl font-black text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={24} strokeWidth={3} /> {result.message || '辨識成功'}
                </h3>
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-md border-4 border-emerald-700 flex items-baseline gap-2">
                  <span className="text-xs font-bold opacity-80">總熱量</span>
                  <span className="text-xl sm:text-2xl font-black">{result.total_calories?.toFixed(0)}</span>
                  <span className="text-xs font-bold opacity-80">kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {result.detected_items?.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border-4 border-emerald-100 shadow-sm text-center flex flex-col justify-center hover:border-emerald-300 transition-all">
                    <div className="bg-emerald-100 text-emerald-700 w-fit mx-auto px-2 py-0.5 rounded-lg text-[10px] font-black uppercase mb-2 border-2 border-emerald-200">
                      {(item.confidence * 100).toFixed(0)}% Match
                    </div>
                    <span className="text-sm font-black text-slate-700 capitalize mb-1">{item.class}</span>
                    <span className="text-xs font-bold text-slate-400 mb-2">{item.estimated_weight_g?.toFixed(1)} g</span>
                    <span className="text-emerald-600 font-black text-lg">{item.calories?.toFixed(0)} kcal</span>
                  </div>
                ))}
                {(!result.detected_items || result.detected_items.length === 0) && (
                  <div className="col-span-full text-center text-slate-400 font-bold py-4 border-4 border-dashed border-slate-200 rounded-2xl">未能明確辨識出食物組件。</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 執行分析的按鈕 (包含上傳或執行測試) */}
        {!result && previewUrl && (
          <button
            onClick={showTestPreview ? executeTestImageAnalysis : handleUpload}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg disabled:opacity-50 flex items-center justify-center shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
          >
            {isAnalyzing ? <><Activity className="animate-spin mr-3" /> 模型推論中...</> : <><Sparkles className="mr-3" /> 開始 AI YOLO 辨識</>}
          </button>
        )}
      </div>

      {/* --- 下部：對話式紀錄 --- */}
      <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden flex flex-col h-[600px] md:h-[700px]">
        <div className="p-5 border-b-4 border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-600" />
            <h3 className="font-black text-slate-800">歷史辨識分析對話</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">點擊左側紀錄查看詳情</span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 左側列表 */}
          <div className="w-full md:w-1/3 border-r-4 border-slate-100 overflow-y-auto bg-slate-50/30 scrollbar-hide">
            {records.map((rec, idx) => (
              <div
                key={rec.id || idx}
                onClick={() => handleRecordSelect(rec)}
                className={`p-5 border-b-2 border-slate-100 cursor-pointer transition-all ${selectedChatRecord?.id === rec.id ? 'bg-white shadow-inner border-l-8 border-l-indigo-500' : 'hover:bg-white'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border-2 border-slate-200">
                    {rec.created_at?.split('.')[0] || 'Unknown'}
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md border-2 ${rec.ai_health_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>Score: {rec.ai_health_score}</span>
                </div>
                <p className="text-sm font-black text-slate-700 truncate mb-1.5">總熱量: {rec.total_calories?.toFixed(0)} kcal</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-bold">{rec.ai_evaluation}</p>
              </div>
            ))}
          </div>

          {/* 右側內容 (電腦版顯示) */}
          <div className="hidden md:flex flex-1 p-8 bg-slate-50/50 flex-col">
            {selectedChatRecord ? (
              renderRecordDetails()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Info size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-black">點擊左側紀錄開始深度分析</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔽 手機版專用：浮出式詳細分析卡片 */}
      {showMobileDetail && selectedChatRecord && (
        <div className="fixed inset-0 z-[100] md:hidden flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full h-[90vh] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col">
            <div className="bg-white p-4 flex justify-center border-b-4 border-slate-100 z-10 shrink-0 relative">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-2" />
              <button onClick={() => setShowMobileDetail(false)} className="absolute right-6 top-4 bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><X size={20} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="bg-indigo-600 text-white px-5 py-2 rounded-2xl shadow-lg border-4 border-indigo-700">
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Health Score</p>
                  <p className="text-3xl font-black">{selectedChatRecord.ai_health_score}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 mb-1">辨識時間</p>
                  <p className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md border-2 border-slate-200">{selectedChatRecord.created_at?.split('.')[0]}</p>
                </div>
              </div>

              {renderRecordDetails()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diet;
