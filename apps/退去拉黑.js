import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs/promises'
import fs_ from 'node:fs'
import path from 'path'
import fetch from 'node-fetch'
import { isQQBot } from 'plugins/wawa-plugin/resources/resources/CommonReplyUtil.js'

const _path = process.cwd()

export class outNotice extends plugin {
  constructor() {
    super({
      name: "退群通知",
      dsc: "xx退群了",
      event: "notice.group.decrease"
    })

    /** 退群提示词 */

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

    async getLeaveGroupBlacklistConfig(e) {
        try {
            const data = await fs.readFile(this.leaveGroupBlacklistConfigPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取退群黑名单配置失败:', error);
            return {};
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
  async accept(e) {
      const groupId = e.group_id;
        const userId = e.user_id;
        const operatorId = e.operator_id
    if (this.e.user_id == this.e.self_id) return

    let name
    if (this.e.member) {
      name = this.e.member.card || this.e.member.nickname
    }

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
}
}
