export type BackgroundSound='off'|'rain'|'brown';
/** Locally generated noise: no downloads, microphone, tracking or autoplay. */
export async function startBackgroundSound(kind:Exclude<BackgroundSound,'off'>){
 const ctx=new AudioContext();let stopped=false;
 try{await ctx.resume();const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;
 for(let i=0;i<data.length;i++){const white=Math.random()*2-1;last=(last+.02*white)/1.02;data[i]=kind==='brown'?last*3.5:white*.35;}
 // Fade loop edges to avoid sharp clicks at the seam.
 for(let i=0;i<400;i++){data[i]*=i/400;data[data.length-1-i]*=i/400;}
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=kind==='rain'?5000:800;gain.gain.value=0.12;
 source.connect(filter).connect(gain).connect(ctx.destination);source.start();
 return {stop(){if(stopped)return;stopped=true;source.stop();void ctx.close();},suspend(){return ctx.suspend();},resume(){return ctx.resume();}};
 }catch(e){await ctx.close();throw e;}
}
