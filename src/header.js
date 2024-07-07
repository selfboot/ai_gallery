import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const getTitle = () => {
        const path = location.pathname.split('/')[2];
        if (path) return t(path + '_title');
        return t('home');
    };

    return (
        <div className="flex items-center p-4">

            <h1 className="text-xl">{getTitle()}</h1>
            <span onClick={() => navigate(-1)} className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center ml-4">
                <FontAwesomeIcon icon={faArrowLeft} />
            </span>
        </div>
    );
};

export default Header;
