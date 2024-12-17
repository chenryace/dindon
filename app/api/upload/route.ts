import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { cookies } from 'next/headers'

const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
})

// 生成公共访问 URL
function getPublicUrl(fileName: string) {
  // 使用配置的公共访问域名，确保没有结尾的斜杠
  const publicDomain = (process.env.PUBLIC_DOMAIN || '').replace(/\/$/, '')
  // 确保文件名开头没有斜杠
  const cleanFileName = fileName.replace(/^\//, '')
  return `${publicDomain}/${cleanFileName}`
}

export async function POST(req: Request) {
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

    const uploadedFiles = []

    for (const file of files) {
      if (!(file instanceof File)) {
        continue
      }

      // 生成文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop()
      const fileName = `${timestamp}-${randomStr}.${ext}`

      // 上传到 R2
      const buffer = Buffer.from(await file.arrayBuffer())
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
          // 设置缓存控制和公共访问
          CacheControl: 'public, max-age=31536000',
          ACL: 'public-read',
        })
      )

      // 生成公共访问 URL
      const url = getPublicUrl(fileName)
      
      // 添加到结果列表
      uploadedFiles.push({
        originalName: file.name,
        fileName,
        url,
        markdown: `![${file.name}](${url})`,
        bbcode: `[img]${url}[/img]`,
        html: `<img src="${url}" alt="${file.name}" />`,
        size: file.size,
        type: file.type,
        uploadTime: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, message: '上传失败' },
      { status: 500 }
    )
  }
}
