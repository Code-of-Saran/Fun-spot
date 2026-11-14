import CyberButton from './CyberButton';

export default function BackButton({ to = '/', label = 'BACK HOME', variant = 'ghost', ...rest }) {
  return (
    <CyberButton to={to} variant={variant} icon="←" iconPosition="start" {...rest}>
      {label}
    </CyberButton>
  );
}
