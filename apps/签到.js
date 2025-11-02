import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs/promises'
import fs_ from 'node:fs'
import path from 'path'

const _path = process.cwd()

export class signIn extends plugin {
    constructor() {
        super({
            name: '签到',
            dsc: '每日签到获取积分',
            event: 'message',
            priority: 5,
            rule: [
                {
                    reg: '^#?签到$',
                    fnc: 'dailySignIn'
                },
                {
                    reg: '^#?签到排行榜$',
                    fnc: 'signInRanking'
                },
                {
                    reg: '^#?我的签到$',
                    fnc: 'mySignIn'
                }/*,
                {
                    reg: '^#?补签$',
                    fnc: 'makeUpSignIn'
                }*/,
                {
                    reg: '^#?重置签到 (\\d+)$',
                    fnc: 'resetUserSignIn',
                    permission: 'master'
                }
            ]
        })
        this.signInDataPath = path.join(`${_path}/plugins/example/config`, `signInData.json`)
    }

    async init() {
        const configDir = path.dirname(this.signInDataPath);
        if (!fs_.existsSync(configDir)) {
            await fs.mkdir(configDir, { recursive: true });
        }
        if (!fs_.existsSync(this.signInDataPath)) {
            await fs.writeFile(this.signInDataPath, JSON.stringify({}), 'utf8');
        }
    }

    async getSignInData() {
        try {
            const data = await fs.readFile(this.signInDataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取签到数据失败:', error);
            return {};
        }
    }

    async saveSignInData(data) {
        try {
            await fs.writeFile(this.signInDataPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存签到数据失败:', error);
            return false;
        }
    }

    // 获取今天的日期字符串 (YYYY-MM-DD)
    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // 获取昨天的日期字符串 (YYYY-MM-DD)
    getYesterdayString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // 计算两个日期之间的天数差
    getDaysDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    }

    // 生成随机积分奖励 (1-10)
    getRandomReward() {
        return Math.floor(Math.random() * 9) + 1;
    }

    // 计算连续签到奖励倍数
    getContinuousBonus(continuousDays) {
        if (continuousDays >= 30) return 3.0;
        if (continuousDays >= 15) return 2.5;
        if (continuousDays >= 7) return 2.0;
        if (continuousDays >= 3) return 1.5;
        return 1.0;
    }

    async dailySignIn(e) {
        const userId = e.user_id;
        const today = this.getTodayString();
        const yesterday = this.getYesterdayString();
        
        const signInData = await this.getSignInData();
        
        // 初始化用户数据
        if (!signInData[userId]) {
            signInData[userId] = {
                totalDays: 0,
                continuousDays: 0,
                totalPoints: 0,
                lastSignInDate: null,
                signInDates: []
            };
        }

        const userData = signInData[userId];

        // 检查今天是否已经签到
        if (userData.lastSignInDate === today) {
            e.reply(`您今天已经签到过了！\n连续签到：${userData.continuousDays}天\n总积分：${userData.totalPoints}`, true);
            return true;
        }

        // 计算基础积分奖励
        const baseReward = this.getRandomReward();
        
        // 检查连续签到
        if (userData.lastSignInDate === yesterday) {
            // 连续签到
            userData.continuousDays += 1;
        } else {
            // 断签，重置连续天数
            userData.continuousDays = 1;
        }

        // 计算连续签到奖励倍数
        const bonus = this.getContinuousBonus(userData.continuousDays);
        const finalReward = Math.floor(baseReward * bonus);

        // 更新用户数据
        userData.totalDays += 1;
        userData.totalPoints += finalReward;
        userData.lastSignInDate = today;
        userData.signInDates.push(today);

        // 保存数据
        await this.saveSignInData(signInData);

        // 构建回复消息
        let replyMessage = `签到成功！\n`;
        replyMessage += `获得积分：${finalReward}`;
        if (bonus > 1.0) {
            replyMessage += ` (基础${baseReward} × ${bonus}倍连续奖励)`;
        }
        replyMessage += `\n连续签到：${userData.continuousDays}天`;
        replyMessage += `\n累计签到：${userData.totalDays}天`;
        replyMessage += `\n总积分：${userData.totalPoints}`;

        // 特殊里程碑提示
        if (userData.continuousDays === 7) {
            replyMessage += `\n🎉 连续签到7天，获得2倍奖励！`;
        } else if (userData.continuousDays === 15) {
            replyMessage += `\n🎉 连续签到15天，获得2.5倍奖励！`;
        } else if (userData.continuousDays === 30) {
            replyMessage += `\n🎉 连续签到30天，获得3倍奖励！`;
        }

        e.reply(replyMessage, true);
        return true;
    }

    async signInRanking(e) {
        const signInData = await this.getSignInData();
        
        // 转换为数组并按总积分排序
        const rankings = Object.entries(signInData)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 10); // 取前10名

        if (rankings.length === 0) {
            e.reply('暂无签到数据！', true);
            return true;
        }

        let replyMessage = '📊 签到排行榜 (前10名)\n';
        replyMessage += '━━━━━━━━━━━━━━\n';
        
        for (let i = 0; i < rankings.length; i++) {
            const rank = i + 1;
            const user = rankings[i];
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            replyMessage += `${medal} ${user.userId}\n`;
            replyMessage += `   积分：${user.totalPoints} | 连续：${user.continuousDays}天 | 累计：${user.totalDays}天\n`;
        }

        e.reply(replyMessage, true);
        return true;
    }

    async mySignIn(e) {
        const userId = e.user_id;
        const signInData = await this.getSignInData();
        
        if (!signInData[userId]) {
            e.reply('您还没有签到记录，快来签到吧！', true);
            return true;
        }

        const userData = signInData[userId];
        const today = this.getTodayString();
        const hasSignedToday = userData.lastSignInDate === today;

        let replyMessage = `📋 您的签到信息\n`;
        replyMessage += `━━━━━━━━━━━━━━\n`;
        replyMessage += `总积分：${userData.totalPoints}\n`;
        replyMessage += `累计签到：${userData.totalDays}天\n`;
        replyMessage += `连续签到：${userData.continuousDays}天\n`;
        replyMessage += `最后签到：${userData.lastSignInDate || '从未签到'}\n`;
        replyMessage += `今日状态：${hasSignedToday ? '✅ 已签到' : '❌ 未签到'}`;

        e.reply(replyMessage, true);
        return true;
    }

    async makeUpSignIn(e) {
        const userId = e.user_id;
        const signInData = await this.getSignInData();
        
        if (!signInData[userId]) {
            e.reply('您还没有签到记录，无法补签！', true);
            return true;
        }

        const userData = signInData[userId];
        const today = this.getTodayString();
        const yesterday = this.getYesterdayString();

        // 检查今天是否已经签到
        if (userData.lastSignInDate === today) {
            e.reply('您今天已经签到过了，无需补签！', true);
            return true;
        }

        // 检查是否可以补签（只能补签昨天）
        if (userData.lastSignInDate === yesterday) {
            e.reply('您昨天已经签到过了，无需补签！', true);
            return true;
        }

        // 检查积分是否足够（补签需要50积分）
        const makeUpCost = 50;
        if (userData.totalPoints < makeUpCost) {
            e.reply(`补签需要${makeUpCost}积分，您当前积分不足！`, true);
            return true;
        }

        // 执行补签
        userData.totalPoints -= makeUpCost;
        userData.totalDays += 1;
        userData.continuousDays += 1;
        userData.lastSignInDate = yesterday;
        userData.signInDates.push(yesterday);

        await this.saveSignInData(signInData);

        e.reply(`补签成功！\n消耗积分：${makeUpCost}\n连续签到：${userData.continuousDays}天\n剩余积分：${userData.totalPoints}`, true);
        return true;
    }

    async resetUserSignIn(e) {
        const match = e.msg.match(/^#?重置签到 (\d+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#重置签到 [用户ID]');
            return true;
        }
        
        const targetUserId = parseInt(match[1]);
        const signInData = await this.getSignInData();
        
        if (!signInData[targetUserId]) {
            e.reply(`用户 ${targetUserId} 没有签到记录。`);
            return true;
        }

        delete signInData[targetUserId];
        await this.saveSignInData(signInData);
        
        e.reply(`已重置用户 ${targetUserId} 的签到记录。`);
        return true;
    }
}
/*签到插件 - 每日签到获取积分*/