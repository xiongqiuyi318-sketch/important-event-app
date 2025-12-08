import { EventCategory, EventStep } from '../types';

// 步骤配置映射 - 所有分类的标准步骤
const CATEGORY_STEPS: Record<EventCategory, string[]> = {
  '发货': [
    '验货单',
    '客人确认block list',
    '做pi给客人',
    '做T2L并提前一天通知矿山把柜子叉出来',
    '做invoice并将invoice及时发送给客人（如果是欧洲客人的话）',
    '将invoice,T2L,Russia Statement及时发送给货代',
    '等货代的MRN和VGM做PL',
    '把全套单证发给客人（PL, MRN, invoice）'
  ],
  '进口': [
    '确认采购单（需孙矿签字）',
    '确认PI（许总签字）',
    '确认发货日期',
    '准备好进口报关单证（invoice,PL,CE，进口报关申报表）',
    '确认收货'
  ],
  '本地销售': [
    '记录好本月的record或delivery note',
    '在下一月制作发票',
    '及时将发票发给客人和会计师'
  ],
  '开会': [
    '准备会议议程',
    '通知参会人员',
    '准备会议材料',
    '召开会议',
    '整理会议纪要'
  ],
  '学习': [
    '确定学习主题',
    '收集学习资料',
    '制定学习计划',
    '完成学习内容',
    '总结学习成果'
  ],
  '项目开发': [
    '需求分析',
    '设计规划',
    '开发实现',
    '测试验收',
    '部署上线'
  ],
  '活动策划': [
    '确定活动主题',
    '制定活动方案',
    '准备活动物资',
    '执行活动',
    '活动总结'
  ],
  '机械维修': [
    '故障诊断',
    '制定维修方案',
    '准备维修工具和备件',
    '执行维修',
    '测试验收'
  ],
  '其他': [
    '分析需求',
    '制定计划',
    '执行任务',
    '检查完成'
  ]
};

// 将步骤数组转换为EventStep数组的辅助函数
const createStepsFromArray = (stepContents: string[]): EventStep[] => {
  const timestamp = Date.now();
  return stepContents.map((content, index) => ({
    id: `step-${timestamp}-${index}`,
    content,
    completed: false,
    order: index
  }));
};

// 检查步骤是否匹配标准步骤内容
const isStepMatched = (stepContent: string, standardContents: string[]): boolean => {
  return standardContents.some(content => 
    stepContent.includes(content) || content.includes(stepContent)
  );
};

export const generateStepsForCategory = (
  category: EventCategory,
  title: string,
  description?: string
): EventStep[] => {
  const steps: EventStep[] = [];
  
  // 从配置中获取标准步骤
  const standardSteps = CATEGORY_STEPS[category];
  if (standardSteps) {
    steps.push(...createStepsFromArray(standardSteps));
  }
  
  // 如果有描述，从描述中提取步骤
  if (description) {
    const lines = description.split('\n').filter(line => line.trim());
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      // 检查是否已经存在类似步骤
      const exists = steps.some(step => 
        step.content.includes(trimmedLine) || trimmedLine.includes(step.content)
      );
      
      if (!exists && trimmedLine.length > 0) {
        // 如果行以数字开头（如"1. xxx"），提取内容
        const match = trimmedLine.match(/^\d+[\.、]\s*(.+)$/);
        const content = match ? match[1] : trimmedLine;
        
        steps.push({
          id: `step-${Date.now()}-${steps.length}`,
          content,
          completed: false,
          order: steps.length
        });
      }
    });
  }
  
  // 如果没有生成任何步骤，至少创建一个基于标题的步骤
  if (steps.length === 0) {
    steps.push({
      id: `step-${Date.now()}-0`,
      content: `完成 ${title}`,
      completed: false,
      order: 0
    });
  }
  
  // 为步骤分配正确的order
  return steps.map((step, index) => ({ ...step, order: index }));
};

export const updateStepsFromDescription = (
  currentSteps: EventStep[],
  description: string,
  category: EventCategory
): EventStep[] => {
  let baseSteps: EventStep[] = [];
  
  // 获取该分类的标准步骤
  const standardSteps = CATEGORY_STEPS[category];
  if (standardSteps) {
    // 保留匹配标准步骤的已有步骤
    baseSteps = currentSteps.filter(step => 
      isStepMatched(step.content, standardSteps)
    );
  }
  
  // 从描述中提取新步骤
  const lines = description.split('\n').filter(line => line.trim());
  const newSteps: EventStep[] = [...baseSteps];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return;
    
    // 检查是否已经存在
    const exists = newSteps.some(step => {
      const stepContent = step.content.toLowerCase();
      const lineContent = trimmedLine.toLowerCase();
      return stepContent === lineContent || 
             stepContent.includes(lineContent) || 
             lineContent.includes(stepContent);
    });
    
    if (!exists) {
      // 如果行以数字开头，提取内容
      const match = trimmedLine.match(/^\d+[\.、]\s*(.+)$/);
      const content = match ? match[1] : trimmedLine;
      
      newSteps.push({
        id: `step-${Date.now()}-${newSteps.length}-${index}`,
        content,
        completed: false,
        order: newSteps.length
      });
    }
  });
  
  // 重新分配order
  return newSteps.map((step, index) => ({ ...step, order: index }));
};
