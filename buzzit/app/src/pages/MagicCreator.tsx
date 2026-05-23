import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Image as ImageIcon, MessageSquare, LayoutList, Smartphone, MessageCircle } from 'lucide-react';

export default function MagicCreator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowResults(true);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">マジック・クリエイター</h2>
        <p className="text-slate-400">1つのアイデアや画像から、全てのSNSプラットフォームに最適化されたコンテンツを自動生成します。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
              素材を入力
            </h3>
            
            <div className="space-y-4">
              <div className="h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors cursor-pointer">
                <ImageIcon className="w-6 h-6 mb-2" />
                <span className="text-sm">画像や動画をドロップ</span>
              </div>
              
              <div>
                <label className="text-xs text-slate-400 mb-1 block">伝えたい内容・アイデア</label>
                <textarea 
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="例: 新作の春カラーをアピールしたい。透明感があって色落ちしにくいのが特徴。"
                ></textarea>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 animate-spin" />
                    魔法をかけています...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    各SNS用に一発生成
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-2 relative min-h-[500px]">
          {!showResults && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700">
                <LayoutList className="w-8 h-8 opacity-50" />
              </div>
              <p>素材を入力して生成を開始してください</p>
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 animate-pulse" />
              </div>
              <p className="mt-4 animate-pulse">過去のバズパターンから最適な台本を構成中...</p>
            </div>
          )}

          {showResults && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  生成結果 (Repurpose)
                </h3>
                <button className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors">
                  すべて一括予約
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Result Item 1 */}
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-pink-500" />
                    <span className="font-medium text-sm">リール動画・台本</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-sm text-slate-300 mb-4 h-32 overflow-hidden relative">
                    <p>【タイトル】春カラー、もう失敗したくない人へ🌸</p>
                    <p className="mt-2">【フック】「春だから明るくしたいけど、すぐ色落ちしちゃう…」そんなお悩みありませんか？</p>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">編集・予約</button>
                </div>

                {/* Result Item 2 */}
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-pink-500" />
                    <span className="font-medium text-sm">カルーセル投稿 (画像)</span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="w-1/3 aspect-[4/5] bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">表紙</div>
                    <div className="w-1/3 aspect-[4/5] bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">特徴1</div>
                    <div className="w-1/3 aspect-[4/5] bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">CTA</div>
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">編集・予約</button>
                </div>

                {/* Result Item 3 */}
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-5 h-5 text-sky-500" />
                    <span className="font-medium text-sm">X (Twitter) スレッド</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-sm text-slate-300 mb-4 line-clamp-3">
                    美容師歴10年が教える、春カラーを長持ちさせる3つの絶対ルール。これを知らないと1週間で金髪になります…👇
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">編集・予約</button>
                </div>

                {/* Result Item 4 */}
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-sm">LINE公式アカウント配信</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-sm text-slate-300 mb-4 line-clamp-3">
                    こんにちは！いよいよ春ですね🌸\n\n今日はLINEのお友だち限定で、新作の「透明感・春カラー」のご案内です✨
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">編集・予約</button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
