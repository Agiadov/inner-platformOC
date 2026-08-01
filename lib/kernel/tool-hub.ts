import { kernelEventBus } from "@/lib/kernel/event-bus";
import { kernelMemory } from "@/lib/kernel/memory-engine";

export type ToolCapability={id:string;description:string};
export type ToolDefinition={id:string;name:string;version:string;capabilities:ToolCapability[];execute:(capability:string,input:unknown)=>Promise<unknown>};

export class KernelToolHub{private tools=new Map<string,ToolDefinition>();
register(tool:ToolDefinition){this.tools.set(tool.id,tool);kernelMemory.write({kind:"tool",key:`tool:${tool.id}`,value:tool,tags:[tool.name]});kernelEventBus.emit({type:"tool.registered",payload:{toolId:tool.id}});}
get(id:string){return this.tools.get(id)}
list(){return [...this.tools.values()]}
async execute(toolId:string,capability:string,input:unknown){const tool=this.tools.get(toolId);if(!tool)throw new Error(`Unknown tool ${toolId}`);kernelEventBus.emit({type:"tool.started",payload:{toolId,capability}});try{const result=await tool.execute(capability,input);kernelEventBus.emit({type:"tool.completed",payload:{toolId,capability}});return result;}catch(e){kernelEventBus.emit({type:"tool.failed",payload:{toolId,capability,error:e instanceof Error?e.message:String(e)}});throw e;}}
}
export const kernelTools=new KernelToolHub();