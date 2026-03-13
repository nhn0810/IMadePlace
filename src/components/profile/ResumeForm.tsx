'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, ArrowLeft, Briefcase, Award, AlignLeft, Layout, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Skill = { name: string; level: number }
type History = { year: string; duration?: string; content: string }

export function ResumeForm({ initialData }: { initialData: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [bio, setBio] = useState(initialData.bio || '')
  const [skills, setSkills] = useState<Skill[]>(initialData.skills || [])
  const [history, setHistory] = useState<History[]>(initialData.work_history || [])
  const [introSections, setIntroSections] = useState<Record<string, string>>(initialData.intro_sections || {
    "자신을 한마디로 표현한다면?": "",
    "개발자로서의 강점은 무엇인가요?": ""
  })
  const [coreValues, setCoreValues] = useState<any[]>(initialData.core_values || [])
  const [showResume, setShowResume] = useState(initialData.show_resume || false)

  const handleAddSkill = () => {
    if (skills.length >= 7) {
      alert('스위트 7개까지만 선택해주시는 것이 포트폴리오 디자인상 가장 예쁩니다!')
    }
    setSkills([...skills, { name: '', level: 50 }])
  }

  const handleUpdateSkill = (index: number, field: keyof Skill, value: string | number) => {
    const newSkills = [...skills]
    newSkills[index] = { ...newSkills[index], [field]: value }
    setSkills(newSkills)
  }

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const handleAddHistory = () => {
    setHistory([...history, { year: '', content: '' }])
  }

  const handleUpdateHistory = (index: number, field: keyof History, value: string) => {
    const newHistory = [...history]
    newHistory[index] = { ...newHistory[index], [field]: value }
    setHistory(newHistory)
  }

  const handleRemoveHistory = (index: number) => {
    setHistory(history.filter((_, i) => i !== index))
  }

  const handleAddCoreValue = () => {
    setCoreValues([...coreValues, { title: '', content: '' }])
  }

  const handleUpdateCoreValue = (index: number, field: string, value: string) => {
    const next = [...coreValues]
    next[index] = { ...next[index], [field]: value }
    setCoreValues(next)
  }

  const handleRemoveCoreValue = (index: number) => {
    setCoreValues(coreValues.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio,
          skills,
          work_history: history,
          intro_sections: introSections,
          core_values: coreValues,
          show_resume: showResume
        })
        .eq('id', initialData.id)

      if (error) throw error
      alert('저장되었습니다!')
      router.push('/profile')
      router.refresh()
    } catch (e: any) {
      alert('저장에 실패했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">포트폴리오 정보 관리</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile/builder"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-200 hover:bg-slate-900 font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            <Layout className="w-4 h-4" />
            빌더로 이동
          </Link>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </header>

      <div className="space-y-8">
        {/* Bio Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <AlignLeft className="w-5 h-5 text-emerald-500" />
              나를 소개하는 문구
            </div>
            <button
              onClick={() => setShowResume(!showResume)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                showResume 
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {showResume ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showResume ? '다른 사람에게 공개됨' : '현재 나만 보기'}
            </button>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자신을 소개하는 한 문장이나 문구를 입력하세요. (포트폴리오 메인 창에 표시됩니다)"
            className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium text-slate-800 text-sm"
          />
        </section>

        {/* Skills Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Award className="w-5 h-5 text-emerald-500" />
              보유 스킬
            </div>
            <button
              onClick={handleAddSkill}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              스킬 추가
            </button>
          </div>
          
          <div className="space-y-3">
            {skills.map((skill, index) => (
              <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all">
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => handleUpdateSkill(index, 'name', e.target.value)}
                  placeholder="스킬명 (예: React)"
                  className="flex-1 min-w-[120px] bg-white border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                />
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={skill.level}
                    onChange={(e) => handleUpdateSkill(index, 'level', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-sm font-black text-emerald-600 w-10">{skill.level}%</span>
                </div>
                <button
                  onClick={() => handleRemoveSkill(index)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm italic">추가된 스킬이 없습니다.</p>
            )}
          </div>
        </section>

        {/* History Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              이력 사항 (연혁)
            </div>
            <button
              onClick={handleAddHistory}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              이력 추가
            </button>
          </div>

          <div className="space-y-3">
            {history.map((item, index) => (
              <div key={index} className="space-y-2 p-4 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all relative">
                <button
                  onClick={() => handleRemoveHistory(index)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex gap-2 pr-10">
                  <input
                    type="text"
                    value={item.year}
                    onChange={(e) => handleUpdateHistory(index, 'year', e.target.value)}
                    placeholder="시기 (예: 2023)"
                    className="w-1/4 bg-white border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                  />
                  <input
                    type="text"
                    value={item.duration || ''}
                    onChange={(e) => handleUpdateHistory(index, 'duration', e.target.value)}
                    placeholder="기간 (예: 3개월, 선택사항)"
                    className="w-1/4 bg-white border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={item.content}
                  onChange={(e) => handleUpdateHistory(index, 'content', e.target.value)}
                  placeholder="내용 (예: OO 프로젝트 UI 개발)"
                  className="w-full bg-white border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm italic">추가된 이력 사항이 없습니다.</p>
            )}
          </div>
        </section>

        {/* Core Values Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Award className="w-5 h-5 text-emerald-500" />
              핵심 가치 (Core Values)
            </div>
            <button
              onClick={handleAddCoreValue}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              가치 추가
            </button>
          </div>
          
          <div className="space-y-4">
            {coreValues.map((cv, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-2xl relative group border border-transparent hover:border-slate-200 transition-all">
                <button
                  onClick={() => handleRemoveCoreValue(index)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={cv.title}
                  onChange={(e) => handleUpdateCoreValue(index, 'title', e.target.value)}
                  placeholder="가치 제목 (예: 효율적인 로직 설계)"
                  className="w-full bg-white mb-2 border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                />
                <textarea
                  value={cv.content}
                  onChange={(e) => handleUpdateCoreValue(index, 'content', e.target.value)}
                  placeholder="해당 가치에 대한 설명을 입력하세요."
                  className="w-full h-24 p-4 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-800 text-sm"
                />
              </div>
            ))}
            {coreValues.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm italic">추가된 핵심 가치가 없습니다.</p>
            )}
          </div>
        </section>

        {/* Intro Sections */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
            <AlignLeft className="w-5 h-5 text-emerald-500" />
            자유로운 소개 및 질문 (Q&A)
          </div>
          <div className="space-y-4">
            {Object.entries(introSections).map(([question, answer], idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl relative group">
                <button
                  onClick={() => {
                    const next = { ...introSections }
                    delete next[question]
                    setIntroSections(next)
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => {
                    const next = { ...introSections }
                    const val = e.target.value
                    if (val !== question) {
                      next[val] = answer
                      delete next[question]
                      setIntroSections(next)
                    }
                  }}
                  placeholder="질문 (예: 저의 강점은...)"
                  className="w-full bg-white mb-2 border-slate-200 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                />
                <textarea
                  value={answer}
                  onChange={(e) => setIntroSections({ ...introSections, [question]: e.target.value })}
                  placeholder="내용을 입력하세요."
                  className="w-full h-24 p-4 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-800 text-sm"
                />
              </div>
            ))}
            <button
              onClick={() => setIntroSections({ ...introSections, "새로운 질문": "" })}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              질문 추가하기
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
