/**
 * spike/pty/02-send-prompt.ts
 *
 * 目的：用 pty 拉起 claude，编程式发送一条 prompt，读到完整回复，干净退出。
 *
 * Done criteria（本周 MVP）：
 *   - 拉起 claude 进入交互模式
 *   - stdin 写入一条 prompt 字符串
 *   - stdout 能读到模型的回复内容
 *   - 收完回复后能主动结束进程
 *
 * 跑法：
 *   cd spike/pty && pnpm run 02
 *
 * ⚠️ 本文件目前是**骨架**。
 *    实际编排逻辑等 01-spawn-claude 跑通、确认 claude 在 pty 里的行为后再补。
 *    之所以先放骨架，是为了在维护者下线期间把"目录形状"先定下来，
 *    回来开干时无需再起结构。
 */

import * as pty from "node-pty";

const TODO = `
TODO（维护者周末跑 01 后再实现）：
  1. 决定用 \`claude --print "<prompt>"\` 还是交互模式
     - --print 模式：单次问答，自然退出，更容易跑通
     - 交互模式：能验证 stdin 多轮，但需要识别 prompt 结束符
  2. 选定后，把下面的 main() 填实
  3. 跑通后把现象记到 notes.md，把结论更新到 spike/pty/README.md "结论" 段
`;

async function main() {
  console.log("[send-prompt] 骨架文件，未实现。\n" + TODO);
  console.log(
    `[send-prompt] node-pty 已加载（spawn API 可用：${typeof pty.spawn === "function"}）`,
  );
  process.exit(2); // exit 2 表示"未实现"，跟跑挂了的 1 区分
}

main().catch((err) => {
  console.error("[send-prompt] UNEXPECTED:", err);
  process.exit(1);
});
