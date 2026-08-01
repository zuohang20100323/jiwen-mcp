const { createJiwen } = require('@clarashafiq/jiwen');
const { createServer } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { callToolRequestSchema, listToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// 创建积温实例
const jiwen = createJiwen({
  getLastMessage: () => null,
  connectionRateFn: () => 0.0007,
  verbose: true,
});

let lastTickTime = Date.now();

// 每5分钟tick一次
setInterval(async () => {
  const elapsed = (Date.now() - lastTickTime) / 1000 / 60;
  lastTickTime = Date.now();
  
  const triggers = await jiwen.tick(elapsed);
  if (triggers.length > 0) {
    console.log('[积温] 触发:', triggers.map(t => t.action).join(', '));
  }
}, 5 * 60 * 1000);

const server = createServer({
  name: 'jiwen-mcp',
  version: '1.0.0',
}, async () => ({
  capabilities: { tools: {} },
}));

server.setRequestHandler(listToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'jiwen_tick',
      description: '推进积温状态，返回触发行为',
      inputSchema: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: '经过的分钟数' },
        },
      },
    },
    {
      name: 'jiwen_state',
      description: '获取当前积温状态',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'jiwen_apply_delta',
      description: '应用情绪变化',
      inputSchema: {
        type: 'object',
        properties: {
          pride: { type: 'number' },
          valence: { type: 'number' },
          arousal: { type: 'number' },
          connection: { type: 'number' },
        },
      },
    },
    {
      name: 'jiwen_reset',
      description: '重置连接需求',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(callToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'jiwen_tick': {
      const minutes = args?.minutes || 5;
      const triggers = await jiwen.tick(minutes);
      const state = await jiwen.getState();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ triggers, state }, null, 2),
        }],
      };
    }
    case 'jiwen_state': {
      const state = await jiwen.getState();
      const ctx = jiwen.getPromptContext();
      const style = jiwen.getStyleGuidance();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ state, context: ctx, style }, null, 2),
        }],
      };
    }
    case 'jiwen_apply_delta': {
      await jiwen.applyDelta(args || {});
      const state = await jiwen.getState();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ state }, null, 2),
        }],
      };
    }
    case 'jiwen_reset': {
      await jiwen.resetConnection();
      const state = await jiwen.getState();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ state }, null, 2),
        }],
      };
    }
    default:
      return {
        content: [{ type: 'text', text: `未知工具: ${name}` }],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('积温MCP服务器已启动');
}

main().catch(console.error);
