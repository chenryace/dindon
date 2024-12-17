import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { cookies } from 'next/headers'

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true })
  } catch (error) {
    if ((error as any).code !== 'EEXIST') {
      throw error
    }
  }
}

export async function POST(req: Request) {
  // 验证登录状态
  const cookieStore = cookies()
  const auth = cookieStore.get('auth')
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    )
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有上传文件' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await ensureDir(uploadDir)

    const savedFiles = []

    for (const file of files) {
      if (!(file instanceof File)) {
        continue
      }

      // 生成文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop()
      const fileName = `${timestamp}-${randomStr}.${ext}`
      
      // 保存文件
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = join(uploadDir, fileName)
      await writeFile(filePath, buffer)

      // 添加到结果列表
      savedFiles.push({
        originalName: file.name,
        fileName,
        url: `/uploads/${fileName}`,
        size: file.size,
        type: file.type
      })
    }

    return NextResponse.json({
      success: true,
      files: savedFiles
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, message: '上传失败' },
      { status: 500 }
    )
  }
}
