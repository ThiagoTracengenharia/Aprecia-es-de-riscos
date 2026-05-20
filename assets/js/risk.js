/* =================================================================
   RISK.JS — Cálculos HRN e classificação de risco
   Trace Engenharia · Apreciação de Riscos
   Extraído do index.html durante a Fase 2 (refactor estrutural)

   Metodologia HRN (Hazard Rating Number) — NBR 12100 / NR 12
     HRN = LO × FE × DPH × NP
       LO  = Likelihood of Occurrence
       FE  = Frequency of Exposure
       DPH = Degree of Possible Harm
       NP  = Number of People at risk

   Graus:
     Baixo      : HRN ≤ 5
     Médio      : HRN ≤ 50
     Alto       : HRN ≤ 500
     Muito Alto : HRN > 500
   ================================================================= */

function hrn(lo,fe,dph,np){ return Math.round(parseFloat(lo)*parseFloat(fe)*parseFloat(dph)*parseFloat(np)*100)/100; }
function grau(h){ return h<=5?'Baixo':h<=50?'Médio':h<=500?'Alto':'Muito Alto'; }
function grauCls(g){ return {Baixo:'rb-baixo',Médio:'rb-medio',Alto:'rb-alto','Muito Alto':'rb-muitoalto'}[g]||'rb-baixo'; }
function grauColor(g){ return {Baixo:'#166534',Médio:'#92400e',Alto:'#991b1b','Muito Alto':'#5b21b6'}[g]||'#166534'; }
function grauBg(g){ return {Baixo:'#dcfce7',Médio:'#fef3c7',Alto:'#fee2e2','Muito Alto':'#ede9fe'}[g]||'#dcfce7'; }
