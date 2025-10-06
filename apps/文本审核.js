import fs from 'fs/promises'
import fs_ from 'node:fs'
import path from 'path'
import fetch from 'node-fetch'
import { isQQBot } from 'plugins/wawa-plugin/resources/CommonReplyUtil.js'

const _path = process.cwd()
const api = 嘿壳API

export class messageAudit extends plugin {
    constructor() {
        super({
            name: '消息审核',
            dsc: '让你发消息了吗',
            event: 'message',
            priority: -Infinity,
            rule: [
                {
                    reg: /.*/,
                    fnc: 'auditMessage'
                },
                {
                    reg: '^#?设置审核配置 (\\d+) (\\S+) (\\S+)$',
                    fnc: 'setAuditConfig',
                    permission: 'master'
                },
                {
                    reg: '^#?删除审核配置 (\\d+)$',
                    fnc: 'deleteAuditConfig',
                    permission: 'master'
                },
                {
                    reg: '^#?加用户白名单 (\\d+)?$',
                    fnc: 'addAuditUserWhitelist',
                    permission: 'master'
                },
                {
                    reg: '^#?删用户白名单 (\\d+)$',
                    fnc: 'deleteAuditUserWhitelist',
                    permission: 'master'
                },
                {
                    reg: '^#?加群白名单 (\\d+)$',
                    fnc: 'addAuditGroupWhitelist',
                    permission: 'master'
                },
                {
                    reg: '^#?删群白名单 (\\d+)$',
                    fnc: 'deleteAuditGroupWhitelist',
                    permission: 'master'
                },
                {
                    reg: '^#?设置审核模式 (\\d+) (recallOnly|default)$',
                    fnc: 'setAuditMode',
                    permission: 'master'
                },
                {
                    reg: '^#?警告.*$',
                    fnc: 'manualWarn',
                    permission: 'master'
                },
                {
                    reg: '^#?清空违规次数.*$',
                    fnc: 'clearViolationCount',
                    permission: 'master'
                },
                {
                    reg: '^#?加黑名单 (\\d+)?$',
                    fnc: 'addBlacklist',
                    permission: 'master'
                },
                {
                    reg: '^#?删黑名单 (\\d+)$',
                    fnc: 'deleteBlacklist',
                    permission: 'master'
                },
                {
                    reg: '^#?设置退群黑名单 (\\d+) (开启|关闭)$',
                    fnc: 'setLeaveGroupBlacklist',
                    permission: 'master'
                },
                {
                    reg: '^#?退群黑名单状态 (\\d+)$',
                    fnc: 'getLeaveGroupBlacklistStatus',
                    permission: 'master'
                }
            ]
            
        })
        this.leaveGroupBlacklistConfigPath = path.join(`./plugins/wawa-plugin/config`, `leaveGroupBlacklistConfig.json`)
        this.groupConfigPath = path.join(`./plugins/wawa-plugin/config`, `auditGroupConfig.json`)
        this.userWhitelistPath = path.join(`./plugins/wawa-plugin/config`, `auditUserWhitelist.json`)
        this.groupWhitelistPath = path.join(`./plugins/wawa-plugin/config`, `auditGroupWhitelist.json`)
        this.violationCountPath = path.join(`./plugins/wawa-plugin/config`, `auditViolationCount.json`)
        this.blacklistPath = path.join(`./plugins/wawa-plugin/config`, `auditBlacklist.json`)
    }

    async init() {
        const configDir = path.dirname(this.groupConfigPath);
        if (!fs_.existsSync(configDir)) {
            await fs.mkdir(configDir, { recursive: true });
        }
        if (!fs_.existsSync(this.groupConfigPath)) {
            await fs.writeFile(this.groupConfigPath, JSON.stringify({}), 'utf8');
        }
        if (!fs_.existsSync(this.userWhitelistPath)) {
            await fs.writeFile(this.userWhitelistPath, JSON.stringify([]), 'utf8');
        }
        if (!fs_.existsSync(this.groupWhitelistPath)) {
            await fs.writeFile(this.groupWhitelistPath, JSON.stringify([]), 'utf8');
        }
        if (!fs_.existsSync(this.violationCountPath)) {
            await fs.writeFile(this.violationCountPath, JSON.stringify({}), 'utf8');
        }
        if (!fs_.existsSync(this.blacklistPath)) {
            await fs.writeFile(this.blacklistPath, JSON.stringify([]), 'utf8');
        }
        if (!fs_.existsSync(this.leaveGroupBlacklistConfigPath)) {
            await fs.writeFile(this.leaveGroupBlacklistConfigPath, JSON.stringify({}), 'utf8');
        }
    }

    async getGroupConfig() {
        try {
            const data = await fs.readFile(this.groupConfigPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取群配置失败:', error);
            return {};
        }
    }

    async saveGroupConfig(config) {
        try {
            await fs.writeFile(this.groupConfigPath, JSON.stringify(config, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存群配置失败:', error);
            return false;
        }
    }

    async getUserWhitelist() {
        try {
            const data = await fs.readFile(this.userWhitelistPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取用户白名单失败:', error);
            return [];
        }
    }

    async saveUserWhitelist(whitelist) {
        try {
            await fs.writeFile(this.userWhitelistPath, JSON.stringify(whitelist, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存用户白名单失败:', error);
            return false;
        }
    }

    async getGroupWhitelist() {
        try {
            const data = await fs.readFile(this.groupWhitelistPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取群白名单失败:', error);
            return [];
        }
    }

    async saveGroupWhitelist(whitelist) {
        try {
            await fs.writeFile(this.groupWhitelistPath, JSON.stringify(whitelist, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存群白名单失败:', error);
            return false;
        }
    }

    async getViolationCount() {
        try {
            const data = await fs.readFile(this.violationCountPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取违规计数失败:', error);
            return {};
        }
    }

    async saveViolationCount(count) {
        try {
            await fs.writeFile(this.violationCountPath, JSON.stringify(count, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存违规计数失败:', error);
            return false;
        }
    }

    async getBlacklist() {
        try {
            const data = await fs.readFile(this.blacklistPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取黑名单失败:', error);
            return [];
        }
    }

    async saveBlacklist(blacklist) {
        try {
            await fs.writeFile(this.blacklistPath, JSON.stringify(blacklist, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存黑名单失败:', error);
            return false;
        }
    }

    async getLeaveGroupBlacklistConfig() {
        try {
            const data = await fs.readFile(this.leaveGroupBlacklistConfigPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取退群黑名单配置失败:', error);
            return {};
        }
    }

    async saveLeaveGroupBlacklistConfig(config) {
        try {
            await fs.writeFile(this.leaveGroupBlacklistConfigPath, JSON.stringify(config, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存退群黑名单配置失败:', error);
            return false;
        }
    }

    async auditMessage(e) {
           if (isQQBot(e)) {
            return false;
        }
           if (e.isMaster) {
            return false;
        }
        if (!e.isGroup) {
            return false
        }

        const groupId = e.group_id
        const userId = e.user_id
        const message = e.msg
        const messageId = e.message_id
        
        //增加发送违禁词收集表
        if (message === "违禁词误判收集表") {
            e.reply("https://docs.qq.com/form/page/DRGd0YXdHQmt0b21k\n如对违禁词检查有异议请填此表，恶意刷数据将拉黑处理")
            return true
        }

        // 0. 黑名单检查
        const blacklist = await this.getBlacklist();
        if (blacklist.includes(userId)) {
            console.log(`用户 ${userId} 在黑名单中，将其踢出群聊。`);
            await e.group.kickMember(userId);
            await e.recall(); // 撤回黑名单成员的消息
            const violationReportGroup = 1059192795;
                const groupNames = {
                    '436322748': '新手群',
                    '883503867': '卧底群',
                    '755942306': '进阶群'
                };
            const groupName = groupNames[groupId] || groupId;
                const userName = e.member.nickname || userId;
                const violationMessage = `[黑名单踢出报告] 群：${groupName}，用户：${userName}（${userId}），消息：${message}`;
                try {
                    // 尝试多种发送方式
                    if (e.bot && e.bot.sendGroupMsg) {
                        await e.bot.sendGroupMsg(violationReportGroup, violationMessage);
                    } else if (Bot && Bot.sendGroupMsg) {
                        await Bot.sendGroupMsg(violationReportGroup, violationMessage);
                    } else if (e.group && e.group.sendMsg) {
                        await e.group.sendMsg(violationReportGroup, violationMessage);
                    } else {
                        console.log('无法找到发送群消息的方法，违规消息未发送到指定群');
                    }
                } catch (error) {
                    console.error('发送违规消息到指定群失败:', error);
                }
            return true; // 阻止消息继续传递
        }

        // 1. 群白名单检查
        const groupWhitelist = await this.getGroupWhitelist();
        if (!groupWhitelist.includes(groupId)) {
            console.log(`群 ${groupId} 不在白名单中，跳过消息审核。`);
            return false;
        }

        // 用户白名单检查 (已存在)
        const userWhitelist = await this.getUserWhitelist();
        if (userWhitelist.includes(userId)) {
            console.log(`用户 ${userId} 在白名单中，跳过消息审核。`);
            return false;
        }

        const groupConfigs = await this.getGroupConfig();
        const appConfig = groupConfigs[groupId];

        if (!appConfig || !appConfig.appId || !appConfig.appToken) {
            console.log(`群 ${groupId} 未配置AppID或AppToken，跳过消息审核。`);
            return false;
        }

        try {
            const response = await fetch(`${api}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-ID': appConfig.appId,
                    'X-App-Token': appConfig.appToken
                },
                body: JSON.stringify({ text: message })
            });
            const result = await response.json();

            if (result.code === 401 && result.result === '违规') {
                console.log(`群 ${groupId} 成员 ${userId} 发送违规消息: ${message}`);
                await e.recall();

                // 发送违规消息到指定群
                const violationReportGroup = 1059192795;
                const groupNames = {
                    '436322748': '新手群',
                    '883503867': '卧底群',
                    '755942306': '进阶群'
                };
                const groupName = groupNames[groupId] || groupId;
                const userName = e.member.nickname || userId;
                const violationMessage = `[违规消息报告] 群：${groupName}，用户：${userName}（${userId}），消息：${message}`;
                try {
                    // 尝试多种发送方式
                    if (e.bot && e.bot.sendGroupMsg) {
                        await e.bot.sendGroupMsg(violationReportGroup, violationMessage);
                    } else if (Bot && Bot.sendGroupMsg) {
                        await Bot.sendGroupMsg(violationReportGroup, violationMessage);
                    } else if (e.group && e.group.sendMsg) {
                        await e.group.sendMsg(violationReportGroup, violationMessage);
                    } else {
                        console.log('无法找到发送群消息的方法，违规消息未发送到指定群');
                    }
                } catch (error) {
                    console.error('发送违规消息到指定群失败:', error);
                }

                // 检查审核模式
                if (appConfig.mode === 'recallOnly') {
                            await e.group.muteMember(userId, 30);
                   // e.reply(`您的消息涉嫌违规，已撤回。已禁言1分钟`, true);
                    return true;
                }

                // 阶梯式惩罚和踢出成员
                const violationCounts = await this.getViolationCount();
                violationCounts[userId] = (violationCounts[userId] || 0) + 1;
                await this.saveViolationCount(violationCounts);

                let muteDuration = violationCounts[userId] * 600; // 每次增加10分钟 (600秒)
                let replyMessage = `您的消息涉嫌违规，已撤回并禁言${violationCounts[userId] * 10}分钟。`;

                if (violationCounts[userId] >= 20) {
                    replyMessage = `您的消息多次违规，已将您移出群聊。`;
                    e.reply(replyMessage, true);
                    await e.group.kickMember(userId); // 踢出成员
                    const blacklist = await this.getBlacklist();
                    if (!blacklist.includes(userId)) {
                        blacklist.push(userId);
                        await this.saveBlacklist(blacklist);
                    }
                    delete violationCounts[userId]; // 清除违规计数
                    await this.saveViolationCount(violationCounts);
                    return true; // 踢出后不再禁言，直接返回
                }

                if (muteDuration > 0) {
                    await e.group.muteMember(userId, muteDuration);
                }
                e.reply(replyMessage + `\n违规20次将被踢出群聊～`, true);
                
                return true; // 违规消息处理完毕，阻止消息继续传递
            } else {
                console.log(`群 ${groupId} 成员 ${userId} 消息审核通过。`);
            }
        } catch (error) {
            console.error(`消息审核API调用失败:`, error);
        }

        return true; // 消息继续传递给其他插件
    }

    async setAuditConfig(e) {
        const match = e.msg.match(/^#?设置审核配置 (\d+) (\S+) (\S+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#设置审核配置 [群号] [AppID] [AppToken]');
            return true;
        }
        const groupId = parseInt(match[1]);
        const appId = match[2];
        const appToken = match[3];

        const groupConfigs = await this.getGroupConfig();
        groupConfigs[groupId] = { appId, appToken, mode: groupConfigs[groupId]?.mode || 'default' }; // 保留原有模式

        if (await this.saveGroupConfig(groupConfigs)) {
            e.reply(`群 ${groupId} 的审核配置已更新。`);
        } else {
            e.reply(`更新群 ${groupId} 的审核配置失败。`);
        }
        return true;
    }

    async deleteAuditConfig(e) {
        const match = e.msg.match(/^#?删除审核配置 (\d+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#删除审核配置 [群号]');
            return true;
        }
        const groupId = parseInt(match[1]);

        const groupConfigs = await this.getGroupConfig();
        if (groupConfigs[groupId]) {
            delete groupConfigs[groupId];
            if (await this.saveGroupConfig(groupConfigs)) {
                e.reply(`群 ${groupId} 的审核配置已删除。`);
            } else {
                e.reply(`删除群 ${groupId} 的审核配置失败。`);
            }
        } else {
            e.reply(`群 ${groupId} 没有审核配置。`);
        }
        return true;
    }

    async addAuditUserWhitelist(e) {
        const match = e.msg.match(/^#?加用户白名单\s*(\d+)?$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#添加用户白名单[@用户]');
            return true;
        }
        const userId = parseInt(match[1]) || e.at;

        const whitelist = await this.getUserWhitelist();
        if (!whitelist.includes(userId)) {
            whitelist.push(userId);
            if (await this.saveUserWhitelist(whitelist)) {
                e.reply(`用户 ${userId} 已添加到用户白名单。`);
            } else {
                e.reply(`添加用户 ${userId} 到用户白名单失败。`);
            }
        } else {
            e.reply(`用户 ${userId} 已在用户白名单中。`);
        }
        return true;
    }

    async deleteAuditUserWhitelist(e) {
        const match = e.msg.match(/^#?删用户白名单 (\d+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#删除用户白名单 [用户ID]');
            return true;
        }
        const userId = parseInt(match[1]);

        let whitelist = await this.getUserWhitelist();
        const index = whitelist.indexOf(userId);
        if (index > -1) {
            whitelist.splice(index, 1);
            if (await this.saveUserWhitelist(whitelist)) {
                e.reply(`用户 ${userId} 已从用户白名单中删除。`);
            } else {
                e.reply(`从用户白名单中删除用户 ${userId} 失败。`);
            }
        } else {
            e.reply(`用户 ${userId} 不在用户白名单中。`);
        }
        return true;
    }

    async addAuditGroupWhitelist(e) {
        const match = e.msg.match(/^#?加群白名单 (\d+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#添加群白名单 [群号]');
            return true;
        }
        const groupId = parseInt(match[1]) || e.at;

        const whitelist = await this.getGroupWhitelist();
        if (!whitelist.includes(groupId)) {
            whitelist.push(groupId);
            if (await this.saveGroupWhitelist(whitelist)) {
                e.reply(`群 ${groupId} 已添加到群白名单。`);
            } else {
                e.reply(`添加群 ${groupId} 到群白名单失败。`);
            }
        } else {
            e.reply(`群 ${groupId} 已在群白名单中。`);
        }
        return true;
    }

    async deleteAuditGroupWhitelist(e) {
        const match = e.msg.match(/^#?删群白名单 (\d+)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#删除群白名单 [群号]');
            return true;
        }
        const groupId = parseInt(match[1]);

        let whitelist = await this.getGroupWhitelist();
        const index = whitelist.indexOf(groupId);
        if (index > -1) {
            whitelist.splice(index, 1);
            if (await this.saveGroupWhitelist(whitelist)) {
                e.reply(`群 ${groupId} 已从群白名单中删除。`);
            } else {
                e.reply(`从群白名单中删除群 ${groupId} 失败。`);
            }
        } else {
            e.reply(`群 ${groupId} 不在群白名单中。`);
        }
        return true;
    }

    async setAuditMode(e) {
        const match = e.msg.match(/^#?设置审核模式 (\d+) (recallOnly|default)$/);
        if (!match) {
            e.reply('命令格式不正确，请使用：#设置审核模式 [群号] [recallOnly|default]');
            return true;
        }
        const groupId = parseInt(match[1]);
        const mode = match[2];

        const groupConfigs = await this.getGroupConfig();
        if (!groupConfigs[groupId]) {
            e.reply(`群 ${groupId} 尚未设置审核配置，请先使用 #设置审核配置 命令。`);
            return true;
        }
        groupConfigs[groupId].mode = mode;

        if (await this.saveGroupConfig(groupConfigs)) {
            e.reply(`群 ${groupId} 的审核模式已设置为：${mode === 'recallOnly' ? '仅撤回' : '默认（禁言+踢出）'}。`);
        } else {
            e.reply(`更新群 ${groupId} 的审核模式失败。`);
        }
        return true;
    }

    async manualWarn(e) {
        if (!e.isGroup) {
            e.reply('该命令只能在群聊中使用。', true);
            return true;
        }

        const groupId = e.group_id;
        const userId = e.user_id;
        const match = e.msg.match(/^#?警告.*$/);

        if (!match) {
            e.reply('命令格式不正确，请使用：#警告 @[成员]', true);
            return true;
        }

        const targetUserId = e.at;

        // 检查是否为白名单用户，白名单用户不能被警告
        const userWhitelist = await this.getUserWhitelist();
        if (userWhitelist.includes(targetUserId)) {
            e.reply(`用户 ${targetUserId} 在白名单中，无法对其进行警告。`, true);
            return true;
        }

        const violationCounts = await this.getViolationCount();
        violationCounts[targetUserId] = (violationCounts[targetUserId] || 0) + 1;
        await this.saveViolationCount(violationCounts);

        let muteDuration = violationCounts[targetUserId] * 600; // 每次增加10分钟 (600秒)
        let replyMessage = `已对用户 ${targetUserId} 进行警告，其违规次数为 ${violationCounts[targetUserId]} 次，并禁言${violationCounts[targetUserId] * 10}分钟。`;

        if (violationCounts[targetUserId] >= 20) {
            replyMessage = `已对用户 ${targetUserId} 进行警告，其违规次数已达 ${violationCounts[targetUserId]} 次，已将其移出群聊。`;
            e.reply(replyMessage, true);
                    await e.group.kickMember(targetUserId); // 踢出成员
                    const blacklist = await this.getBlacklist();
                    if (!blacklist.includes(targetUserId)) {
                        blacklist.push(targetUserId);
                        await this.saveBlacklist(blacklist);
                    }
                    delete violationCounts[targetUserId]; // 清除违规计数
                    await this.saveViolationCount(violationCounts);
                    return true; // 踢出后不再禁言，直接返回
        }

        if (muteDuration > 0) {
            await e.group.muteMember(targetUserId, muteDuration);
        }
        e.reply(replyMessage + `\n违规20次将被踢出群聊～`, true);
        
        return true;
    }

    async clearViolationCount(e) {
        if (!e.isGroup) {
            e.reply('该命令只能在群聊中使用。', true);
            return true;
        }

        const targetUserId = e.at;

        if (!targetUserId) {
            e.reply('请@要清空违规次数的用户。', true);
            return true;
        }

        const violationCounts = await this.getViolationCount();
        if (violationCounts[targetUserId]) {
            delete violationCounts[targetUserId];
            await this.saveViolationCount(violationCounts);
            e.reply(`已清空用户 ${targetUserId} 的违规次数。`, true);
        } else {
            e.reply(`用户 ${targetUserId} 没有违规记录。`, true);
        }
        return true;
    }

    async addBlacklist(e) {
        const match = e.msg.match(/^#?加黑名单\s*(\d+)?$/);
        if (!match) {
            e.reply("命令格式不正确，请使用：#加黑名单[@用户]");
            return true;
        }
        const userId = parseInt(match[1]) || e.at;

        const blacklist = await this.getBlacklist();
        if (!blacklist.includes(userId)) {
            blacklist.push(userId);
            if (await this.saveBlacklist(blacklist)) {
                e.reply(`用户 ${userId} 已添加到黑名单。`);
            } else {
                e.reply(`添加用户 ${userId} 到黑名单失败。`);
            }
        } else {
            e.reply(`用户 ${userId} 已在黑名单中。`);
        }
        return true;
    }

    async deleteBlacklist(e) {
        const match = e.msg.match(/^#?删黑名单 (\d+)$/);
        if (!match) {
            e.reply("命令格式不正确，请使用：#删黑名单 [用户ID]");
            return true;
        }
        const userId = parseInt(match[1]);

        let blacklist = await this.getBlacklist();
        const index = blacklist.indexOf(userId);
        if (index > -1) {
            blacklist.splice(index, 1);
            if (await this.saveBlacklist(blacklist)) {
                e.reply(`用户 ${userId} 已从黑名单中删除。`);
            } else {
                e.reply(`从黑名单中删除用户 ${userId} 失败。`);
            }
        } else {
            e.reply(`用户 ${userId} 不在黑名单中。`);
        }
        return true;
    }

    async setLeaveGroupBlacklist(e) {
        const match = e.msg.match(/^#?设置退群黑名单 (\d+) (开启|关闭)$/);
        if (!match) {
            e.reply("命令格式不正确，请使用：#设置退群黑名单 [群号] [开启|关闭]");
            return true;
        }
        const groupId = parseInt(match[1]);
        const status = match[2] === '开启';

        const config = await this.getLeaveGroupBlacklistConfig();
        config[groupId] = status;

        if (await this.saveLeaveGroupBlacklistConfig(config)) {
            e.reply(`群 ${groupId} 的退群黑名单功能已设置为：${status ? '开启' : '关闭'}。`);
        } else {
            e.reply(`设置群 ${groupId} 的退群黑名单功能失败。`);
        }
        return true;
    }

    async getLeaveGroupBlacklistStatus(e) {
        const match = e.msg.match(/^#?退群黑名单状态 (\d+)$/);
        if (!match) {
            e.reply("命令格式不正确，请使用：#退群黑名单状态 [群号]");
            return true;
        }
        const groupId = parseInt(match[1]);

        const config = await this.getLeaveGroupBlacklistConfig();
        const status = config[groupId] || false;

        e.reply(`群 ${groupId} 的退群黑名单功能当前状态为：${status ? '开启' : '关闭'}。`);
        return true;
    }

/*    async handleGroupDecrease(e) {
        const groupId = e.group_id;
        const userId = e.user_id;
        const operatorId = e.operator_id; // 操作者ID，如果是成员自己退群，则operatorId和userId相同

        const leaveGroupBlacklistConfig = await this.getLeaveGroupBlacklistConfig();
        if (leaveGroupBlacklistConfig[groupId]) {
            const blacklist = await this.getBlacklist();
            if (!blacklist.includes(userId)) {
                blacklist.push(userId);
                await this.saveBlacklist(blacklist);
                // 不在此处回复，由其他退群通知插件处理
                console.log(`用户 ${userId} ${userId === operatorId ? '退出了群聊' : '被管理员移出群聊'}，已将其加入黑名单。`);
            }
        }
    }*/
}

