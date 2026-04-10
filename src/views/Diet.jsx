import React, { useState, useEffect } from 'react';
import {
  Camera, UploadCloud, X, Activity, Sparkles,
  CheckCircle2, Database, Image as ImageIcon, MessageSquare,
  PieChart as PieChartIcon, HeartPulse, Zap, Info, TrendingUp
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';

const Diet = ({ apiFetch, showNotification }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedChatRecord, setSelectedChatRecord] = useState(null); // 這是原本的對話選擇
  const [showMobileDetail, setShowMobileDetail] = useState(false);   // 這是手機版彈窗控制

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

  const useTestImage = async () => {
    setIsAnalyzing(true);
    setPreviewUrl('/test1.jpg');
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

  const handleRecordSelect = (rec) => {
    setSelectedChatRecord(rec);
    if (window.innerWidth < 768) {
      setShowMobileDetail(true);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border-2 border-slate-100">
        <div className="flex items-center mb-8 border-b-2 border-slate-50 pb-6">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mr-4 border-2 border-blue-200"><Camera size={24} /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">飲食 YOLO 視覺辨識</h2>
            <p className="text-slate-500 text-sm font-bold">上傳照片或使用測試樣本進行 AI 分析</p>
          </div>
        </div>

        <div className="mb-6">
          {previewUrl ? (
            <div className="relative border-2 border-slate-200 rounded-3xl p-4 bg-slate-50 shadow-inner">
              <img src={previewUrl} alt="Preview" className="mx-auto max-h-80 rounded-2xl object-contain" />
              <button onClick={() => { setPreviewUrl(null); setResult(null); }} className="absolute top-6 right-6 bg-white p-2 rounded-full shadow-md text-red-500 border-2 border-red-50"><X size={20} /></button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center bg-slate-50/50">
              <div className="bg-blue-50 p-6 rounded-full mb-6 inline-block border-2 border-blue-100"><UploadCloud size={48} className="text-blue-500" /></div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => document.getElementById('fileUpload').click()} className="bg-white border-2 border-slate-200 py-3 px-6 rounded-xl font-bold flex items-center justify-center hover:bg-slate-50 transition shadow-sm"><ImageIcon size={20} className="mr-2" /> 相簿選擇</button>
                <input type="file" id="fileUpload" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
                }} />
                <button onClick={useTestImage} className="bg-emerald-600 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center hover:bg-emerald-700 transition shadow-md"><Zap size={20} className="mr-2" /> 使用測試圖片</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden flex flex-col h-[600px] md:h-[700px]">
        <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-600" />
            <h3 className="font-black text-slate-800">歷史辨識分析對話</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">點擊紀錄查看詳情</span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-full md:w-1/3 border-r-2 border-slate-100 overflow-y-auto bg-slate-50/30">
            {records.map((rec, idx) => (
              <div
                key={rec.id || idx}
                onClick={() => handleRecordSelect(rec)}
                className={`p-5 border-b-2 border-slate-100 cursor-pointer transition-all ${selectedChatRecord?.id === rec.id ? 'bg-white shadow-inner border-l-8 border-l-indigo-500' : 'hover:bg-white'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{rec.created_at?.split(' ')[0]}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${rec.ai_health_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Score: {rec.ai_health_score}</span>
                </div>
                <p className="text-sm font-black text-slate-700 truncate mb-1">總熱量: {rec.total_calories?.toFixed(0)} kcal</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{rec.ai_evaluation}</p>
              </div>
            ))}
          </div>

          <div className="hidden md:flex flex-1 p-8 overflow-y-auto bg-slate-50/50 flex-col gap-8">
            {selectedChatRecord ? (
              <>
                <div className="self-end max-w-[90%] w-full animate-in slide-in-from-right-4">
                  <div className="bg-white p-6 rounded-3xl rounded-tr-none shadow-sm border-2 border-indigo-100">
                    <h4 className="font-black text-slate-700 mb-6 flex items-center gap-2 text-lg">
                      <TrendingUp size={20} className="text-indigo-500" /> 營養組成雷達圖分析
                    </h4>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedChatRecord)}>
                          <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontBold: 800, fill: '#475569' }} />
                          <Radar name="餐點比例" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="self-start max-w-[85%] animate-in slide-in-from-left-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg border-2 border-emerald-400"><Sparkles size={20} /></div>
                    <div className="bg-emerald-600 text-white p-5 rounded-3xl rounded-tl-none shadow-md border-2 border-emerald-500">
                      <p className="text-xs font-black opacity-80 mb-3 border-b border-emerald-400 pb-2">AI 智慧營養師點評</p>
                      <p className="text-base font-bold leading-relaxed italic">"{selectedChatRecord.ai_evaluation}"</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Info size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-black">點擊左側紀錄開始深度分析</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileDetail && selectedChatRecord && (
        <div className="fixed inset-0 z-[100] md:hidden flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-h-[90vh] rounded-t-[40px] shadow-2xl overflow-y-auto animate-in slide-in-from-bottom-10 duration-500">
            <div className="sticky top-0 bg-white p-4 flex justify-center border-b border-slate-100 z-10">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-2" />
              <button onClick={() => setShowMobileDetail(false)} className="absolute right-6 top-4 bg-slate-100 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex justify-between items-center">
                <div className="bg-indigo-600 text-white px-5 py-2 rounded-2xl shadow-lg">
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Health Score</p>
                  <p className="text-3xl font-black">{selectedChatRecord.ai_health_score}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">辨識時間</p>
                  <p className="text-sm font-black text-slate-700">{selectedChatRecord.created_at?.split('.')[0]}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-[32px] border-2 border-slate-100 shadow-inner">
                <h4 className="text-center font-black text-slate-800 mb-2">營養密度雷達圖</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(selectedChatRecord)}>
                      <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} />
                      <Radar name="餐點比例" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-emerald-600" />
                  <span className="font-black text-emerald-800">AI 營養師建議</span>
                </div>
                <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                  "{selectedChatRecord.ai_evaluation}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">預估總熱量</p>
                  <p className="text-lg font-black text-slate-800">{selectedChatRecord.total_calories?.toFixed(0)} kcal</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">分析狀態</p>
                  <p className="text-lg font-black text-emerald-600">辨識成功</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diet;
