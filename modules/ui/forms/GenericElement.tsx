import React from 'react';

export interface GenericElementProps {
    label?: string;
    className?: string;
    children?: React.ReactNode;
}

const GenericElement: React.FC<GenericElementProps> = ({
    label,
    className = "",
    children,
}) => {
    return (
        <div className={`form-control w-full ${className}`}>
            {label && (
                <label className="label">
                    <span className="label-text font-semibold">{label}</span>
                </label>
            )}
            {children}
        </div>
    );
};

export default GenericElement;
