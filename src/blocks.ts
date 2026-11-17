import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as en from 'blockly/msg/en';
import type { Entity, ForgeWorld } from './world';
import { runnerFor } from './devices';
import { validateProgram, type Expr, type Program, type Step } from './program';

Blockly.setLocale(Object.fromEntries(Object.entries(en).filter((entry): entry is [string, string] => typeof entry[1] === 'string')));
Blockly.common.defineBlocksWithJsonArray([
  {type:'forge_event',message0:'%1 %2 %3',args0:[{type:'field_dropdown',name:'EVENT',options:[['On each cycle','cycle'],['On simulation start','start'],['When input changes','change'],['When input becomes active','rise']]},{type:'field_dropdown',name:'INPUT',options:[['sensor','sensor'],['value','value'],['distance','distance'],['temperature','temperature'],['message','message'],['signal','signal']]},{type:'input_statement',name:'BODY'}],colour:38},
  {type:'forge_read',message0:'read input %1',args0:[{type:'field_dropdown',name:'NAME',options:[['sensor','sensor'],['distance','distance'],['temperature','temperature'],['value','value'],['message','message'],['power','power']]}],output:null,colour:172},
  {type:'forge_write',message0:'write %1 = %2',args0:[{type:'field_dropdown',name:'NAME',options:[['open','open'],['enable','enable'],['value','value'],['message','message']]},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,colour:172},
  {type:'forge_wait',message0:'wait %1 seconds',args0:[{type:'input_value',name:'VALUE',check:'Number'}],previousStatement:null,nextStatement:null,colour:205},
  {type:'forge_log',message0:'log %1',args0:[{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,colour:265},
]);
const toolbox = {kind:'categoryToolbox',contents:[
  {kind:'category',name:'Events',colour:'#c39451',contents:[{kind:'block',type:'forge_event'}]},
  {kind:'category',name:'Devices',colour:'#56aa9b',contents:['forge_read','forge_write'].map(type=>({kind:'block',type}))},
  {kind:'category',name:'Logic',colour:'#7295bd',contents:['controls_if','logic_compare','logic_operation','logic_negate','logic_boolean'].map(type=>({kind:'block',type}))},
  {kind:'category',name:'Time & loops',colour:'#78a78a',contents:['forge_wait','controls_repeat_ext','controls_whileUntil'].map(type=>({kind:'block',type}))},
  {kind:'category',name:'Math & text',colour:'#7b88b8',contents:['math_number','math_arithmetic','text','forge_log'].map(type=>({kind:'block',type}))},
  {kind:'category',name:'Variables',custom:'VARIABLE',colour:'#b28c9c'},
]};
const zero:Expr={op:'literal',value:0};
const field=(b:Blockly.Block,key:string)=>String(b.getFieldValue(key)??'');
function expression(block:Blockly.Block|null,depth=0):Expr {
  if(!block)return zero;
  if(depth>23)throw Error('Expression is too deeply nested');
  const child=(name:string)=>expression(block.getInputTargetBlock(name),depth+1);
  switch(block.type) {
    case 'math_number':return {op:'literal',value:Number(field(block,'NUM'))||0};
    case 'text':return {op:'literal',value:field(block,'TEXT').slice(0,512)};
    case 'logic_boolean':return {op:'literal',value:field(block,'BOOL')==='TRUE'};
    case 'forge_read':return {op:'port',name:field(block,'NAME')};
    case 'variables_get':return {op:'variable',name:field(block,'VAR')};
    case 'logic_negate':return {op:'not',value:child('BOOL')};
    case 'math_arithmetic':case 'logic_compare':case 'logic_operation':return {op:'binary',kind:field(block,'OP'),a:child('A'),b:child('B')};
    default:throw Error('Unsupported expression: '+block.type);
  }
}
function statements(first:Blockly.Block|null,depth=0):Step[] {
  if(depth>22)throw Error('Program is too deeply nested');
  const result:Step[]=[];
  for(let b=first;b;b=b.getNextBlock()) {
    if(result.length>=500)throw Error('Too many blocks');
    const read=(name:string)=>expression(b!.getInputTargetBlock(name));
    const nested=(name:string)=>statements(b!.getInputTargetBlock(name),depth+1);
    const name=field(b,'NAME');
    switch(b.type) {
      case 'forge_write':result.push({op:'write',name,value:read('VALUE')});break;
      case 'forge_wait':result.push({op:'wait',name:'',value:read('VALUE')});break;
      case 'forge_log':result.push({op:'log',name:'',value:read('VALUE')});break;
      case 'variables_set':result.push({op:'set',name:field(b,'VAR'),value:read('VALUE')});break;
      case 'controls_repeat_ext':result.push({op:'repeat',value:read('TIMES'),body:nested('DO')});break;
      case 'controls_whileUntil':result.push({op:'while',value:field(b,'MODE')==='UNTIL'?{op:'not',value:read('BOOL')}:read('BOOL'),body:nested('DO')});break;
      case 'controls_if': {
        let fallback=nested('ELSE');
        for(let i=b.inputList.length;i>=0;i--)if(b.getInput('IF'+i))fallback=[{op:'if',value:read('IF'+i),yes:nested('DO'+i),no:fallback}];
        result.push(...fallback);break;
      }
      default:throw Error('Unsupported statement: '+b.type);
    }
  }
  return result;
}
const lit=(value:number|boolean)=>typeof value==='boolean'?{type:'logic_boolean',fields:{BOOL:value?'TRUE':'FALSE'}}:{type:'math_number',fields:{NUM:value}};
const write=(name:string,value:ReturnType<typeof lit>,next?:object)=>({type:'forge_write',fields:{NAME:name},inputs:{VALUE:{block:value}},...(next?{next:{block:next}}:{})});
function template(door:boolean) {
  const input=(name:string)=>({type:'forge_read',fields:{NAME:name}});
  const compare={type:'logic_compare',fields:{OP:'LT'},inputs:{A:{block:input(door?'distance':'temperature')},B:{block:lit(door?5:18)}}};
  const output=door?write('open',lit(true),{type:'forge_wait',inputs:{VALUE:{block:lit(3)}},next:{block:write('open',lit(false))}}):write('enable',lit(true));
  const stmt={type:'controls_if',extraState:{hasElse:true},inputs:{IF0:{block:compare},DO0:{block:output},ELSE:{block:write(door?'open':'enable',lit(false))}}};
  return {blocks:{languageVersion:0,blocks:[{type:'forge_event',x:45,y:40,fields:{EVENT:door?'rise':'cycle',INPUT:'sensor'},inputs:{BODY:{block:stmt}}}]}};
}
export function openBlocks(dialog:HTMLDialogElement,world:ForgeWorld,e:Entity,refresh:()=>void) {
  dialog.innerHTML='<div class="dialog-head"><div><h2>Logic controller</h2><p>Connect a sensor, then route an output to a device.</p></div><button data-close aria-label="Close">×</button></div><div class="block-actions"><button data-door>Auto door example</button><button data-thermostat>Heater example</button><output data-debug></output><button data-apply class="accent">Apply program</button></div><div class="block-host"></div>';
  dialog.showModal();
  const host=dialog.querySelector<HTMLElement>('.block-host')!;
  const workspace=Blockly.inject(host,{media:import.meta.env.BASE_URL+'forge-media/',sounds:false,toolbox,trashcan:true,renderer:'zelos',zoom:{controls:true,wheel:true,startScale:.86},grid:{spacing:20,length:3,colour:'#50596b'}});
  try {
    Blockly.serialization.workspaces.load(e.data.config.blockly?JSON.parse(String(e.data.config.blockly)):template(true),workspace);
  } catch { Blockly.serialization.workspaces.load(template(true),workspace); }
  const debug=dialog.querySelector('output')!;
  const interval=window.setInterval(()=>{const runner=runnerFor(e);debug.textContent=runner?.error||runner?.log||Object.entries(e.node?.out??{}).map(([k,v])=>k+' '+String(v)).join(' · ');},300);
  dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-door]')!.addEventListener('click',()=>Blockly.serialization.workspaces.load(template(true),workspace));
  dialog.querySelector('[data-thermostat]')!.addEventListener('click',()=>Blockly.serialization.workspaces.load(template(false),workspace));
  dialog.querySelector('[data-apply]')!.addEventListener('click',()=>{
    try{
      const roots=workspace.getTopBlocks(false).filter(b=>b.type==='forge_event');
      if(roots.length!==1)throw Error('Use exactly one event block');
      const root=roots[0];
      const program={event:field(root,'EVENT'),input:field(root,'INPUT'),steps:statements(root.getInputTargetBlock('BODY'))} as Program;
      if(!validateProgram(program))throw Error('Program is too large or has unsupported blocks');
      const bundle=JSON.stringify(Blockly.serialization.workspaces.save(workspace));
      if(bundle.length>170000)throw Error('Workspace is too large');
      world.edit(()=>{e.data.config.program=JSON.stringify(program);e.data.config.blockly=bundle;});
      refresh();dialog.close();
    }catch(error){debug.textContent=error instanceof Error?error.message:'Invalid workspace';}
  });
  dialog.addEventListener('close',()=>{clearInterval(interval);workspace.dispose();},{once:true});
  Blockly.svgResize(workspace);
}
