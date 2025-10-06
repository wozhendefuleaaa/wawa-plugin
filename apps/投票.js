import fs from 'fs'
import path from 'path'

// 投票数据存储路径
const voteDataPath = path.join(process.cwd(), 'data', 'voteData.json')

// 确保数据目录存在
if (!fs.existsSync(path.dirname(voteDataPath))) {
  fs.mkdirSync(path.dirname(voteDataPath), { recursive: true })
}

// 初始化投票数据
let voteData = {}
if (fs.existsSync(voteDataPath)) {
  try {
    voteData = JSON.parse(fs.readFileSync(voteDataPath, 'utf8'))
  } catch (e) {
    console.error('读取投票数据失败', e)
    voteData = {}
  }
}

// 保存投票数据到文件
function saveVoteData() {
  try {
    fs.writeFileSync(voteDataPath, JSON.stringify(voteData, null, 2), 'utf8')
  } catch (e) {
    console.error('保存投票数据失败', e)
  }
}

export class VotePlugin extends plugin {
  constructor() {
    super({
      name: '投票插件',
      dsc: '创建投票、参与投票和查看投票结果',
      event: 'message',
      priority: -Infinity,
      rule: [
        {
          reg: /^#创建投票\s+.+/,
          fnc: 'createVote'
        },
        {
          reg: /^#投票\s+\d+\s+\d+/,
          fnc: 'castVote'
        },
        {
          reg: /^#查看投票\s+\d+/,
          fnc: 'viewVote'
        },
        {
          reg: /^#结束投票\s+\d+/,
          fnc: 'endVote'
        },
        {
          reg: /^#投票帮助$/,
          fnc: 'showHelp'
        }
      ]
    })
  }

  /**
   * 创建投票
   */
  async createVote(e) {
    // 提取投票标题和选项
    const content = e.msg.replace(/#创建投票\s+/, '')
    const parts = content.split('|')
    
    if (parts.length < 3) {
      return e.reply('投票格式错误！请使用：#创建投票 标题|选项1|选项2|选项3...\n至少需要两个选项')
    }
    
    const title = parts[0].trim()
    const options = parts.slice(1).map(option => option.trim()).filter(option => option)
    
    if (options.length < 2) {
      return e.reply('至少需要两个投票选项！')
    }
    
    // 生成投票ID
    const voteId = Date.now().toString().slice(-6)
    
    // 创建投票数据
    voteData[voteId] = {
      title,
      options,
      votes: Array(options.length).fill(0),
      voters: [], // 存储已投票用户ID，防止重复投票
      creator: e.user_id,
      status: 'active', // active: 进行中, ended: 已结束
      createTime: new Date().toLocaleString()
    }
    
    // 保存数据
    saveVoteData()
    
    // 回复创建成功
    let replyMsg = `投票创建成功！\n投票ID：${voteId}\n标题：${title}\n选项：\n`
    options.forEach((option, index) => {
      replyMsg += `${index + 1}. ${option}\n`
    })
    replyMsg += `\n参与投票请发送：#投票 ${voteId} 选项编号\n查看结果请发送：#查看投票 ${voteId}`
    
    e.reply(replyMsg)
  }

  /**
   * 参与投票
   */
  async castVote(e) {
    const content = e.msg.replace(/#投票\s+/, '')
    const [voteId, optionIndex] = content.split(/\s+/).map(item => item.trim())
    
    // 验证投票ID
    if (!voteData[voteId]) {
      return e.reply('不存在该投票ID，请检查后重试')
    }
    
    const vote = voteData[voteId]
    
    // 验证投票状态
    if (vote.status !== 'active') {
      return e.reply('该投票已结束，无法参与')
    }
    
    // 验证选项编号
    const index = parseInt(optionIndex, 10) - 1
    if (isNaN(index) || index < 0 || index >= vote.options.length) {
      return e.reply(`选项编号无效，请选择1-${vote.options.length}之间的编号`)
    }
    
    // 验证是否已投票
    if (vote.voters.includes(e.user_id)) {
      return e.reply('你已经参与过该投票了，不能重复投票哦')
    }
    
    // 记录投票
    vote.votes[index] += 1
    vote.voters.push(e.user_id)
    saveVoteData()
    
    e.reply(`投票成功！你选择了：${vote.options[index]}`)
  }

  /**
   * 查看投票结果
   */
  async viewVote(e) {
    const voteId = e.msg.replace(/#查看投票\s+/, '').trim()
    
    if (!voteData[voteId]) {
      return e.reply('不存在该投票ID，请检查后重试')
    }
    
    const vote = voteData[voteId]
    const totalVotes = vote.votes.reduce((sum, count) => sum + count, 0)
    
    let resultMsg = `投票ID：${voteId}\n标题：${vote.title}\n状态：${vote.status === 'active' ? '进行中' : '已结束'}\n创建时间：${vote.createTime}\n\n投票结果：\n`
    
    vote.options.forEach((option, index) => {
      const count = vote.votes[index]
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      resultMsg += `${index + 1}. ${option}：${count}票 (${percentage}%)\n`
    })
    
    resultMsg += `\n总票数：${totalVotes}\n使用#投票 ${voteId} 选项序号即可参与投票`
    
    e.reply(resultMsg)
  }

  /**
   * 结束投票
   */
  async endVote(e) {
    const voteId = e.msg.replace(/#结束投票\s+/, '').trim()
    
    if (!voteData[voteId]) {
      return e.reply('不存在该投票ID，请检查后重试')
    }
    
    const vote = voteData[voteId]
    
    // 只有创建者可以结束投票
    if (vote.creator !== e.user_id) {
      return e.reply('只有投票创建者可以结束投票')
    }
    
    if (vote.status === 'ended') {
      return e.reply('该投票已经结束了')
    }
    
    vote.status = 'ended'
    saveVoteData()
    
    e.reply(`投票ID：${voteId} 已结束\n查看最终结果请发送：#查看投票 ${voteId}`)
  }

  /**
   * 显示帮助信息
   */
  async showHelp(e) {
    const helpMsg = //投票插件使用帮助：
`1. 创建投票：#创建投票 标题|选项1|选项2|选项3...
   示例：#创建投票 今天吃什么|火锅|烧烤|家常菜
   
2. 参与投票：#投票 投票ID 选项编号
   示例：#投票 123456 1
   
3. 查看结果：#查看投票 投票ID
   示例：#查看投票 123456
   
4. 结束投票：#结束投票 投票ID（仅创建者可用）
   示例：#结束投票 123456`
    
    e.reply(helpMsg)
  }
}
