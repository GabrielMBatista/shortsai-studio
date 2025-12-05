import React from 'react';
import { Step } from 'react-joyride';
import { TFunction } from 'i18next';

export const getSettingsTourSteps = (t: TFunction): Step[] => [
    {
        target: 'body',
        content: t('tour.settings.welcome'),
        placement: 'center',
    },
    {
        target: '#geminiKey',
        content: (
            <div>
                {t('tour.settings.gemini')}
                <br />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline mt-2 block">{t('tour.settings.gemini_link')}</a>
            </div>
        ),
    },
    {
        target: '#elevenLabsKey',
        content: (
            <div>
                {t('tour.settings.elevenlabs')}
                <br />
                <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline mt-2 block">{t('tour.settings.elevenlabs_link')}</a>
            </div>
        ),
    },
    {
        target: 'button[type="submit"]',
        content: t('tour.settings.save'),
    }
];

export const getCreationTourSteps = (t: TFunction): Step[] => [
    {
        target: '#topic',
        content: t('tour.creation.topic'),
        placement: 'bottom',
    },
    {
        target: '#language',
        content: t('tour.creation.language'),
        placement: 'bottom',
    },
    {
        target: '#minDuration',
        content: t('tour.creation.duration'),
        placement: 'bottom',
    },
    {
        target: '#style-grid',
        content: t('tour.creation.style'),
        placement: 'top',
    },
    {
        target: '#character-section',
        content: t('tour.creation.characters'),
        placement: 'top',
    },
    {
        target: '#audio-section',
        content: t('tour.creation.audio'),
        placement: 'left',
    },
    {
        target: '#btn-generate',
        content: t('tour.creation.generate'),
        placement: 'top',
    }
];

export const getScriptTourSteps = (t: TFunction): Step[] => [
    {
        target: '#script-header-controls',
        content: t('tour.script.controls'),
        placement: 'bottom',
    },
    {
        target: '#scene-grid',
        content: t('tour.script.scenes'),
        placement: 'top',
    },
    {
        target: '#btn-add-scene',
        content: t('tour.script.add_scene'),
        placement: 'left',
    },
    {
        target: '#btn-generate-all',
        content: t('tour.script.generate_all'),
        placement: 'bottom',
    },
    {
        target: '#btn-preview',
        content: t('tour.script.preview'),
        placement: 'bottom',
    },
    {
        target: '#btn-export',
        content: t('tour.script.export'),
        placement: 'bottom',
    }
];
