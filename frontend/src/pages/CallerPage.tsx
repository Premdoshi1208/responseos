import React, { useState } from 'react';
import { VoiceOrb } from '../components/caller/VoiceOrb';
import { CallControls } from '../components/caller/CallControls';
import { TranscriptPanel } from '../components/caller/TranscriptPanel';
import { ScenarioSelector } from '../components/caller/ScenarioSelector';
import { BehindTheScenes } from '../components/caller/BehindTheScenes';
import { SimulationBanner } from '../components/shared/SimulationBanner';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { useWorkspace } from '../hooks/useWorkspace';
import { TrainingScenario } from '../types';
import { LayoutDashboard, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

export const CallerPage: React.FC = () => {
  const { workspace } = useWorkspace('caller');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  const {
    voiceState,
    messages,
    activeIncidentId,
    audioVolume,
    callDuration,
    isCallActive,
    lastToolResults,
    ttsProvider,
    metrics,
    errorMessage,
    startCall,
    endCall,
    startRecording,
    stopRecordingAndSend,
    sendTextMessage,
    stopSpeaking,
  } = useVoiceCall();

  const handleSelectScenario = (scenario: TrainingScenario) => {
    startCall();
    setTimeout(() => {
      sendTextMessage(scenario.suggestedPrompt);
    }, 1200);
  };

  const openOperatorConsole = () => {
    const operatorToken = localStorage.getItem('responseos_operator_token');
    const url = `/operator?role=operator${operatorToken ? `&token=${operatorToken}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col">
      <SimulationBanner />

      {/* Main Caller Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Top Header / Paired Console Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Caller Voice Interface</span>
              <span className="text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                Public Demonstration
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Speak naturally into your microphone or choose a fictional training scenario.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScenarioModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Scenario Catalog
            </button>

            <button
              onClick={openOperatorConsole}
              className="py-2 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Paired Command Center</span>
              <ExternalLink className="w-3 h-3 text-amber-400/80" />
            </button>
          </div>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Core Layout: Voice Orb + Transcript */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-6">
          {/* Left / Center Column: Orb + Controls */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-3xl bg-surface-dark/60 border border-surface-border shadow-2xl backdrop-blur">
            <VoiceOrb
              state={voiceState}
              volume={audioVolume}
              durationSeconds={callDuration}
            />

            <div className="w-full mt-2">
              <CallControls
                voiceState={voiceState}
                isCallActive={isCallActive}
                onStartCall={startCall}
                onEndCall={endCall}
                onStartRecording={startRecording}
                onStopRecording={stopRecordingAndSend}
                onSendText={sendTextMessage}
                onStopSpeaking={stopSpeaking}
                onOpenScenarios={() => setIsScenarioModalOpen(true)}
              />
            </div>
          </div>

          {/* Right Column: Live Transcript Panel */}
          <div className="lg:col-span-5 w-full">
            <TranscriptPanel messages={messages} ttsProvider={ttsProvider} />
          </div>
        </div>

        {/* Behind the scenes engineering telemetry */}
        <BehindTheScenes
          toolResults={lastToolResults}
          modelUsed={metrics.modelUsed}
          transcriptionMs={metrics.transcriptionMs}
          inferenceMs={metrics.inferenceMs}
          incidentId={activeIncidentId}
          ttsProvider={ttsProvider}
        />
      </div>

      {/* Scenario Selector Modal */}
      <ScenarioSelector
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onSelectScenario={handleSelectScenario}
      />
    </div>
  );
};
