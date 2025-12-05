import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
import { useTranslation } from 'react-i18next';

interface TutorialProps {
    run: boolean;
    steps: Step[];
    onFinish?: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ run, steps, onFinish }) => {
    const { t } = useTranslation();
    const [runTour, setRunTour] = useState(false);

    useEffect(() => {
        setRunTour(run);
    }, [run]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            if (onFinish) onFinish();
        }
    };

    const styles: Partial<Styles> = {
        options: {
            arrowColor: '#1e293b',
            backgroundColor: '#1e293b',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            primaryColor: '#6366f1',
            textColor: '#fff',
            width: 400,
            zIndex: 10000,
        },
        tooltip: {
            borderRadius: '0.75rem',
            padding: '1rem',
            fontSize: '0.9rem',
        },
        buttonNext: {
            backgroundColor: '#6366f1',
            borderRadius: '0.5rem',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            outline: 'none',
        },
        buttonBack: {
            backgroundColor: '#334155',
            borderRadius: '0.5rem',
            color: '#f1f5f9',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            border: '1px solid #475569',
            outline: 'none',
        },
        buttonSkip: {
            backgroundColor: 'transparent',
            borderRadius: '0.5rem',
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            outline: 'none',
            border: '1px solid #475569', // Added border
            marginRight: 'auto', // Push to left if needed, or just keep it
        },
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            run={runTour}
            scrollToFirstStep
            showProgress
            showSkipButton
            scrollOffset={120}
            steps={steps}
            styles={styles}
            locale={{
                back: t('common.back') || 'Back',
                close: t('common.close') || 'Close',
                last: t('common.finish') || 'Finish',
                next: t('common.next') || 'Next',
                skip: t('common.skip') || 'Skip',
            }}
            // @ts-ignore
            disableBeacon={true}
            disableOverlayClose={true}
            spotlightClicks={true}
            floaterProps={{ disableAnimation: true }}
        />
    );
};

export default Tutorial;
