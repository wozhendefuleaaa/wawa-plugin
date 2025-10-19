import fetch from 'node-fetch'
import { segment } from 'oicq'

export class BotBind extends plugin {
  constructor () {
    super({
      name: '野机官机绑定',
      dsc: '发送野机和官机QQ号到指定接口',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(绑定野机官机|野机官机绑定)\\s+\\d+\\s+\\d+$',
          fnc: 'bindBot'
        },
        {
          reg: '^#?(野机官机帮助|绑定帮助)$',
          fnc: 'showHelp'
        }
      ]
    })
  }

  /**
   * 显示帮助信息
   */
  async showHelp() {
    const helpMsg = `野机官机绑定插件使用说明：
指令：#绑定野机官机 [野机QQ号] [官机QQ号]
示例：
#绑定野机官机 123456789 987654321

说明：
- 野机QQ号：需要绑定的野机账号（纯数字）
- 官机QQ号：对应的官机账号（纯数字）
- 发送指令后将自动向接口发送绑定请求
- 前往https://gitee.com/feixingwa/yunzai-qqbot-brushing安装插件`
    await this.reply(helpMsg)
  }

  /**
   * 处理绑定请求
   */
  async bindBot () {
    // 提取用户输入的两个QQ号
    const input = this.e.msg.trim()
    const qqNumbers = input.match(/\d+/g)
    
    // 验证输入格式
    if (!qqNumbers || qqNumbers.length !== 2) {
      await this.reply('输入格式错误！请使用：#绑定野机官机 [野机QQ号] [官机QQ号]\n例如：#绑定野机官机 123456789 987654321\n发送#野机官机帮助查看详细说明')
      return
    }
    
    // 分离两个QQ号
    const yejiQQ = qqNumbers[0]
    const guanjiQQ = qqNumbers[1]
    
    // 验证QQ号格式（简单验证位数）
    if (yejiQQ.length < 5 || yejiQQ.length > 13 || guanjiQQ.length < 5 || guanjiQQ.length > 13) {
      await this.reply('QQ号格式不正确，请检查后重试（QQ号应为5-13位数字）')
      return
    }
    
    try {
      // 发送请求中提示
      await this.reply(`正在提交绑定请求...\n野机QQ：${yejiQQ}\n官机QQ：${guanjiQQ}`)
      
      // 构建请求URL
      const url = `http://zj.g18c.cn:11111/ccc.php?action=6&qq=${encodeURIComponent(yejiQQ)}&bot_uin=${encodeURIComponent(guanjiQQ)}`
      
      // 发送请求
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000 // 10秒超时
      })
      
      // 处理响应
      const resultText = await response.text()
      
      // 解析为JSON（假设接口返回JSON格式）
      let result
      try {
        result = JSON.parse(resultText)
      } catch (e) {
        // 非JSON响应处理
        await this.reply([
          `❌ 接口返回格式异常`,
          `原始响应：${resultText.substring(0, 100)}${resultText.length > 100 ? '...' : ''}`
        ])
        return
      }
      
      // 根据返回码处理不同情况
      let replyMsg = []
      switch(result.code) {
        case 0:
          replyMsg = [
            `✅ 绑定成功！`,
            `野机QQ：${yejiQQ}`,
            `官机QQ：${guanjiQQ}`,
            `接口信息：${result.message || '绑定已生效'}`,
            `前往https://gitee.com/feixingwa/yunzai-qqbot-brushing安装插件`
          ]
          break
        case -1:
          replyMsg = [
            `❌ 绑定失败：参数不全`,
            `请检查输入的QQ号是否完整`,
            `野机QQ：${yejiQQ}`,
            `官机QQ：${guanjiQQ}`
          ]
          break
        case -99:
          replyMsg = [
            `❌ 绑定失败：官机QQ被拉黑`,
            `官机QQ：${guanjiQQ}`,
            `该账号已被系统限制，无法进行绑定`
          ]
          break
        default:
          replyMsg = [
            `❌ 绑定失败（未知错误）`,
            `错误代码：${result.code || '无'}`,
            `错误信息：${result.message || '接口未返回具体原因'}`
          ]
      }
      
      await this.reply(replyMsg)
      
    } catch (error) {
      console.error('野机官机绑定接口调用失败:', error)
      await this.reply(`❌ 绑定请求失败：${error.message || '网络超时或接口异常'}`)
    }
  }
}
