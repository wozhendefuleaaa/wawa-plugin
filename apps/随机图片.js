import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export class RandomImagePlugin extends plugin {
  constructor() {
    super({
      name: '随机图片插件',
      dsc: '随机发送指定目录的图片，支持多目录管理',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: '^#随机图片$',
          fnc: 'sendRandomImage'
        },
        {
          reg: '^#随机图片 (\\w+)$',
          fnc: 'sendRandomImageByCategory'
        },
        {
          reg: '^#设置图片目录 ',
          fnc: 'setImageDir'
        },
        {
          reg: '^#删除图片目录 ',
          fnc: 'deleteImageDir'
        },
        {
          reg: '^#查看图片目录$',
          fnc: 'listImageDirs'
        },
        {
          reg: '^#默认图片目录 ',
          fnc: 'setDefaultDir'
        },
        {
          reg: '^#图片插件帮助$',
          fnc: 'showHelp'
        }
      ]
    });
    
    // 配置文件路径
    this.configPath = path.join(process.cwd(), 'plugins/wawa-plugin/config/config.yaml');
    this.config = this.loadConfig();
    // 冷却时间记录
    this.cooldowns = new Map();
  }

  // 加载配置文件
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const yamlData = fs.readFileSync(this.configPath, 'utf8');
        return yaml.parse(yamlData);
      }
    } catch (error) {
      console.error('读取配置文件失败:', error);
    }
    
    // 默认配置
    return {
      imageDirs: {
        'default': path.join(process.cwd(), 'plugins/wawa-plugin/resources/images')
      },
      defaultDir: 'default',
      cooldown: 5, // 冷却时间(秒)
      adminQQ: [] // 管理员QQ号列表
    };
  }

  // 保存配置
  saveConfig() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, yaml.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('保存配置文件失败:', error);
      return false;
    }
  }

  // 检查冷却
  checkCooldown(userId) {
    const now = Date.now();
    const lastTime = this.cooldowns.get(userId) || 0;
    const cooldownTime = this.config.cooldown * 1000;
    
    if (now - lastTime < cooldownTime) {
      const remaining = Math.ceil((cooldownTime - (now - lastTime)) / 1000);
      return { allowed: false, remaining };
    }
    
    this.cooldowns.set(userId, now);
    return { allowed: true };
  }

  // 检查管理员权限
  isAdmin(userId) {
    // 机器人主人拥有最高权限
    if (this.e?.bot?.config?.master?.includes(Number(userId))) {
      return true;
    }
    // 配置的管理员列表
    return this.config.adminQQ.includes(Number(userId));
  }

  // 获取随机图片
  async getRandomImage(dirKey = null) {
    const key = dirKey || this.config.defaultDir;
    const dirPath = this.config.imageDirs[key];
    
    if (!dirPath) {
      return { success: false, message: `图片目录不存在: ${key}` };
    }
    
    if (!fs.existsSync(dirPath)) {
      return { success: false, message: `图片目录路径不存在: ${dirPath}` };
    }
    
    try {
      const files = await fs.readdir(dirPath);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|bmp|webp|jfif)$/i.test(file)
      );
      
      if (imageFiles.length === 0) {
        return { success: false, message: `目录 ${key} 下没有找到图片文件` };
      }
      
      const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
      const imagePath = path.join(dirPath, randomFile);
      
      return { success: true, path: imagePath, name: randomFile, category: key };
    } catch (error) {
      return { success: false, message: `读取目录失败: ${error.message}` };
    }
  }

  // 发送随机图片(默认目录)
  async sendRandomImage(e) {
    this.e = e;
    
    // 检查冷却
    const cooldown = this.checkCooldown(e.user_id);
    if (!cooldown.allowed) {
      await e.reply(`操作太频繁，请稍后再试（剩余 ${cooldown.remaining} 秒）`);
      return true;
    }
    
    const result = await this.getRandomImage();
    
    if (!result.success) {
      await e.reply(result.message);
      return true;
    }
    
    try {
      await e.reply([segment.image(result.path)]);
      console.log(`[随机图片] 发送图片: ${result.name} (${result.category})`);
    } catch (error) {
      await e.reply('发送图片失败，请检查文件格式或路径');
      console.error('发送图片错误:', error);
    }
    
    return true;
  }

  // 按分类发送随机图片
  async sendRandomImageByCategory(e) {
    this.e = e;
    const category = e.msg.match(/^#随机图片 (\w+)$/)[1];
    
    // 检查冷却
    const cooldown = this.checkCooldown(e.user_id);
    if (!cooldown.allowed) {
      await e.reply(`操作太频繁，请稍后再试（剩余 ${cooldown.remaining} 秒）`);
      return true;
    }
    
    const result = await this.getRandomImage(category);
    
    if (!result.success) {
      await e.reply(result.message);
      return true;
    }
    
    try {
      await e.reply([`来自 ${category} 分类`, segment.image(result.path)]);
      console.log(`[随机图片] 发送图片: ${result.name} (${result.category})`);
    } catch (error) {
      await e.reply('发送图片失败，请检查文件格式或路径');
      console.error('发送图片错误:', error);
    }
    
    return true;
  }

  // 设置图片目录
  async setImageDir(e) {
    this.e = e;
    if (!this.isAdmin(e.user_id)) {
      await e.reply('权限不足，只有管理员可以设置图片目录');
      return true;
    }
    
    const params = e.msg.trim().split(' ');
    if (params.length < 3) {
      await e.reply('使用方法: #设置图片目录 [目录名称] [目录路径]');
      return true;
    }
    
    const dirName = params[1];
    const dirPath = params.slice(2).join(' ');
    
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      await e.reply(`目录不存在: ${dirPath}`);
      return true;
    }
    
    // 检查目录是否有图片
    try {
      const files = await fs.readdir(dirPath);
      const hasImages = files.some(file => 
        /\.(jpg|jpeg|png|gif|bmp|webp|jfif)$/i.test(file)
      );
      
      if (!hasImages) {
        await e.reply(`警告: 目录 ${dirPath} 中未发现图片文件`);
      }
    } catch (error) {
      await e.reply(`读取目录内容失败: ${error.message}`);
      return true;
    }
    
    // 更新配置
    this.config.imageDirs[dirName] = dirPath;
    const success = this.saveConfig();
    
    if (success) {
      await e.reply(`图片目录设置成功: ${dirName} -> ${dirPath}`);
    } else {
      await e.reply('保存配置失败，请检查日志');
    }
    
    return true;
  }

  // 删除图片目录配置
  async deleteImageDir(e) {
    this.e = e;
    if (!this.isAdmin(e.user_id)) {
      await e.reply('权限不足，只有管理员可以删除图片目录');
      return true;
    }
    
    const dirName = e.msg.trim().split(' ')[1];
    if (!dirName) {
      await e.reply('使用方法: #删除图片目录 [目录名称]');
      return true;
    }
    
    if (dirName === this.config.defaultDir) {
      await e.reply(`不能删除默认目录，请先将默认目录切换到其他目录`);
      return true;
    }
    
    if (!this.config.imageDirs[dirName]) {
      await e.reply(`目录 ${dirName} 不存在`);
      return true;
    }
    
    // 删除配置
    delete this.config.imageDirs[dirName];
    const success = this.saveConfig();
    
    if (success) {
      await e.reply(`图片目录 ${dirName} 已删除`);
    } else {
      await e.reply('删除配置失败，请检查日志');
    }
    
    return true;
  }

  // 查看所有图片目录
  async listImageDirs(e) {
    this.e = e;
    let replyMsg = '图片目录列表:\n';
    
    for (const [name, path] of Object.entries(this.config.imageDirs)) {
      const mark = name === this.config.defaultDir ? ' ✅(默认)' : '';
      replyMsg += `- ${name}${mark}: ${path}\n`;
    }
    
    replyMsg += `\n冷却时间: ${this.config.cooldown}秒`;
    await e.reply(replyMsg);
    return true;
  }

  // 设置默认图片目录
  async setDefaultDir(e) {
    this.e = e;
    if (!this.isAdmin(e.user_id)) {
      await e.reply('权限不足，只有管理员可以设置默认图片目录');
      return true;
    }
    
    const dirName = e.msg.trim().split(' ')[1];
    if (!dirName) {
      await e.reply('使用方法: #默认图片目录 [目录名称]');
      return true;
    }
    
    if (!this.config.imageDirs[dirName]) {
      await e.reply(`目录 ${dirName} 不存在，请先设置该目录`);
      return true;
    }
    
    this.config.defaultDir = dirName;
    const success = this.saveConfig();
    
    if (success) {
      await e.reply(`默认图片目录已设置为: ${dirName}`);
    } else {
      await e.reply('保存配置失败，请检查日志');
    }
    
    return true;
  }

  // 显示帮助信息
  async showHelp(e) {
    this.e = e;
    const helpMsg = `
随机图片插件帮助:
#随机图片 - 从默认目录发送一张随机图片
#随机图片 [分类名] - 从指定分类发送一张随机图片
#设置图片目录 [名称] [路径] - 新增/修改图片目录(管理员)
#删除图片目录 [名称] - 删除图片目录配置(管理员)
#查看图片目录 - 显示所有已配置的图片目录
#默认图片目录 [名称] - 设置默认图片目录(管理员)
#图片插件帮助 - 显示本帮助信息
    `.trim();
    
    await e.reply(helpMsg);
    return true;
  }
}
