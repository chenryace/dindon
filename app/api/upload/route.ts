import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { cookies } from 'next/headers'

// 创建 S3 客户端，延迟到实际使用时再初始化
let s3Client: S3Client | null = null

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true
    })
  }
  return s3Client
}

// 检查环境变量配置
function checkEnvironmentVariables() {
  const requiredVars = [
    'S3_REGION',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'S3_ENDPOINT',
    'S3_BUCKET_NAME'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`)
  }

  // 检查域名配置
  if (!process.env.R2_CUSTOM_DOMAIN && !process.env.S3_DOMAIN) {
    throw new Error('未配置访问域名 (R2_CUSTOM_DOMAIN 或 S3_DOMAIN)')
  }
}

// 生成公共访问 URL
function getPublicUrl(fileName: string) {
  const domain = process.env.R2_CUSTOM_DOMAIN || process.env.S3_DOMAIN
  if (!domain) {
    throw new Error('未配置访问域名 (R2_CUSTOM_DOMAIN 或 S3_DOMAIN)')
  }
  return `${domain.replace(/\/$/, '')}/${fileName}`
}

export async function POST(req: Request) {
  console.log('开始处理上传请求')
  
  try {
    // 验证登录状态
    const cookieStore = cookies()
    const auth = cookieStore.get('auth')
    if (!auth) {
      console.log('用户未登录')
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }

    // 验证环境变量（移到实际处理请求时）
    try {
      checkEnvironmentVariables()
      console.log('环境变量验证通过')
    } catch (envError) {
      console.error('环境变量验证失败:', envError)
      return NextResponse.json(
        { success: false, message: envError instanceof Error ? envError.message : '服务器配置错误' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll('files')
    
    console.log('接收到的文件数量:', files.length)
    
    if (!files || files.length === 0) {
      console.log('请求中没有文件')
      return NextResponse.json(
        { success: false, message: '没有上传文件' },
        { status: 400 }
      )
    }

    const uploadedFiles = []
    const client = getS3Client()

    for (const file of files) {
      if (!(file instanceof File)) {
        console.error('无效的文件对象:', file)
        continue
      }

      console.log('处理文件:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      try {
        // 生成文件名
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = file.name.split('.').pop()
        const fileName = `${timestamp}-${randomStr}.${ext}`

        // 读取文件内容
        const arrayBuffer = await file.arrayBuffer()
        console.log('文件内容读取完成:', {
          fileName,
          size: arrayBuffer.byteLength,
          type: file.type
        })

        // 上传到 S3/R2
        console.log('开始上传到存储服务:', {
          bucket: process.env.S3_BUCKET_NAME,
          fileName,
          endpoint: process.env.S3_ENDPOINT
        })

        const uploadResult = await client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: Buffer.from(arrayBuffer),
            ContentType: file.type,
            CacheControl: 'public, max-age=31536000',
            ACL: 'public-read'
          })
        )

        console.log('存储服务响应:', {
          fileName,
          status: uploadResult.$metadata.httpStatusCode,
          requestId: uploadResult.$metadata.requestId
        })

        // 生成访问 URL
        const url = getPublicUrl(fileName)
        console.log('生成访问URL:', url)
        
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
      } catch (uploadError) {
        console.error('文件上传失败:', {
          fileName: file.name,
          error: uploadError instanceof Error ? {
            message: uploadError.message,
            name: uploadError.name,
            stack: uploadError.stack
          } : uploadError
        })
        continue
      }
    }

    if (uploadedFiles.length === 0) {
      console.error('没有文件上传成功')
      return NextResponse.json(
        { success: false, message: '所有文件上传失败' },
        { status: 500 }
      )
    }

    console.log('上传完成:', {
      totalFiles: uploadedFiles.length,
      fileNames: uploadedFiles.map(f => f.fileName)
    })

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('上传过程出错:', error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '上传失败',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
} 