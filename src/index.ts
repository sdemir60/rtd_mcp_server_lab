#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Tool handlers
import { generateScreenHandler } from './handlers/generateScreen.js';
import { checkStandardsHandler } from './handlers/checkStandards.js';
import { getStandardsHandler } from './handlers/getStandards.js';

// Server instance
const server = new Server(
  {
    name: 'rtd-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool tanımlamaları
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_screen',
        description: 'Verilen tablo bilgilerine göre standart ekran kodlarını üretir',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'Tablo adı (örn: Division)',
            },
            screenTitle: {
              type: 'string',
              description: 'Ekran başlığı (örn: Bölüm Tanımları)',
            },
            schema: {
              type: 'string',
              description: 'Şema adı (örn: Common)',
            },
            fields: {
              type: 'array',
              description: 'Tablo alanları',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Alan adı (örn: Code)',
                  },
                  displayName: {
                    type: 'string',
                    description: 'Görünen ad (örn: Kodu)',
                  },
                  constraints: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['Primary', 'Unique', 'IndexA'],
                    },
                    description: 'Alan kısıtlamaları',
                  },
                },
                required: ['name', 'displayName'],
              },
            },
          },
          required: ['tableName', 'screenTitle', 'schema', 'fields'],
        },
      },
      {
        name: 'check_standards',
        description: 'Verilen kodu kodlama standartlarına göre kontrol eder',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Kontrol edilecek kod',
            },
            language: {
              type: 'string',
              enum: ['csharp', 'typescript', 'sql'],
              description: 'Kod dili',
            },
          },
          required: ['code', 'language'],
        },
      },
      {
        name: 'get_standards',
        description: 'Belirli bir konu hakkında kodlama standartlarını getirir',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Standart konusu (örn: dil-tanimlari, property-tanimlama)',
            },
          },
          required: ['topic'],
        },
      },
    ],
  };
});

// Tool çağrılarını işle
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_screen':
        return await generateScreenHandler(args);
      
      case 'check_standards':
        return await checkStandardsHandler(args);
      
      case 'get_standards':
        return await getStandardsHandler(args);
      
      default:
        throw new Error(`Bilinmeyen tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        },
      ],
    };
  }
});

// Server'ı başlat
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RTD MCP Server başlatıldı');
}

main().catch((error) => {
  console.error('Server başlatma hatası:', error);
  process.exit(1);
});