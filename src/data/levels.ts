import type { Level } from '@/types/game';

export const levels: Level[] = [
  {
    id: 1,
    name: '数据库基础',
    description: '第1章 数据库基础概念',
    type: 'normal',
    status: 'available',
    position: { x: 8, y: 78 },
    questionsNeeded: 3,
  },
  {
    id: 2,
    name: '关系数据库理论',
    description: '第2章 关系数据库理论基础',
    type: 'normal',
    status: 'locked',
    position: { x: 20, y: 60 },
    questionsNeeded: 3,
  },
  {
    id: 3,
    name: '数据库设计',
    description: '第3章 数据库设计方法',
    type: 'normal',
    status: 'locked',
    position: { x: 33, y: 72 },
    questionsNeeded: 3,
  },
  {
    id: 4,
    name: 'SQL语言',
    description: '第5章 SQL 语言',
    type: 'normal',
    status: 'locked',
    position: { x: 44, y: 48 },
    questionsNeeded: 3,
  },
  {
    id: 5,
    name: '多表查询',
    description: '第6章 多表查询',
    type: 'normal',
    status: 'locked',
    position: { x: 56, y: 60 },
    questionsNeeded: 3,
  },
  {
    id: 6,
    name: 'MySQL程序设计',
    description: '第7章 MySQL 程序设计',
    type: 'normal',
    status: 'locked',
    position: { x: 66, y: 42 },
    questionsNeeded: 3,
  },
  {
    id: 7,
    name: '存储过程与触发器',
    description: '第8章 存储过程与触发器',
    type: 'normal',
    status: 'locked',
    position: { x: 76, y: 54 },
    questionsNeeded: 3,
  },
  {
    id: 8,
    name: '视图与索引',
    description: '第9章 索引与视图',
    type: 'normal',
    status: 'locked',
    position: { x: 86, y: 38 },
    questionsNeeded: 3,
  },
  {
    id: 9,
    name: '事务管理',
    description: '第10章 事务与并发控制',
    type: 'boss',
    status: 'locked',
    position: { x: 94, y: 24 },
    questionsNeeded: 3,
  },
];

// SVG path for the winding trail
export const mapPath = `
  M 8 78
  C 13 67, 16 59, 20 60
  C 26 61, 27 74, 33 72
  C 39 70, 39 50, 44 48
  C 50 45, 50 61, 56 60
  C 62 59, 61 44, 66 42
  C 71 40, 71 55, 76 54
  C 82 53, 80 40, 86 38
  C 91 36, 90 27, 94 24
`;
