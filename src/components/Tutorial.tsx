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

    const styles: Styles = {
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
        },
        buttonBack: {
            color: '#94a3b8',
            marginRight: '0.5rem',
        },
        buttonSkip: {
            color: '#94a3b8',
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
            steps={steps}
            styles={styles}
            locale={{
                back: t('common.back') || 'Back',
                close: t('common.close') || 'Close',
                last: t('common.finish') || 'Finish',
                next: t('common.next') || 'Next',
                skip: t('common.skip') || 'Skip',
            }}
        />
    );
};

export default Tutorial;
