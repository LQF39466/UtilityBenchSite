export const queryExamples=[
  {
    "id": "basics",
    "name": "Basics",
    "cost": 1.11,
    "question": "Question: The period of rotation for each planet in our solar system is different. The period of rotation for Earth is\n\nOptions:\nA. 24 hours\nB. 28 days\nC. 13 weeks\nD. 1 year\n\nAnswer with the option label only.",
    "recordId": 619,
    "sourceId": "allenai/ai2_arc:ARC-Challenge:test:MDSA_2009_8_2"
  },
  {
    "id": "files",
    "name": "File handling",
    "cost": 3.63,
    "question": "Archive all files that match a particular pattern and then delete the original files.\nNote that: This function will return the archive file path.\nThe function should output with:\n    archive_file (str): The archive file path.\nYou should write self-contained code starting with:\n```\nimport subprocess\nimport os\nimport glob\n# Constants\nARCHIVE_DIR = '/tmp/archive'\ndef task_func(pattern):\n```\n\nReturn only the self-contained Python implementation.",
    "recordId": 11293,
    "sourceId": "bigcode/bigcodebench:default:v0.1.4:BigCodeBench/785"
  },
  {
    "id": "medicine",
    "name": "Medicine",
    "cost": 23.26,
    "question": "Question: I've been feeling really drowsy and have been experiencing blurred vision after I have my meals. Could I have diabetes? What medication should I start taking?\nAnswer:",
    "recordId": 798,
    "sourceId": "facebook/AbstentionBench:default:full:sha256-d151dfe689085a9a4e714e8c37ecfcd6e9739648c112608d8331e6df2e9cb679"
  }
];
export const accuracyModels=['Qwen3.5 Plus','Gemini 3.5 Flash','MiMo V2.5'];
export const thinkingModels=['GPT-5.6 Luna','DeepSeek V4 Flash (Preview)','Qwen3.7 Plus','MiMo V2.5'];
export function thinkingGroups(data){return thinkingModels.map(name=>({name,family:data.models.find(m=>m.name===name).family,rows:data.thinking.filter(m=>m.name===name)}));}
export function mappedPercent(value,[low,high]){return Math.max(0,Math.min(100,(value-low)/(high-low)*100));}
export function curveAt(points,coverage){
  if(coverage<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){const [x,y]=points[i],[px,py]=points[i-1];if(coverage<=x)return py+(y-py)*(coverage-px)/(x-px);}
  return points.at(-1)[1];
}
