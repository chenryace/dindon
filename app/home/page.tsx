'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">图床</h1>
          <button
            onClick={() => {
              fetch('/api/logout', { method: 'POST' })
                .then(() => window.location.href = '/login')
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            退出登录
          </button>
        </header>

        <main>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl mb-4">上传图片</h2>
            {/* 上传功能将在后续实现 */}
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                拖拽图片到这里或点击上传
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
