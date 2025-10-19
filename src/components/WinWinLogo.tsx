interface WinWinLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const WinWinLogo = ({ className = '', size = 'md' }: WinWinLogoProps) => {
  const sizeClasses = {
    sm: 'h-14 w-14',    // 56px × 56px (was 40px)
    md: 'h-16 w-16',    // 64px × 64px (was 48px)
    lg: 'h-20 w-20',    // 80px × 80px (was 64px)
    xl: 'h-24 w-24'     // 96px × 96px (was 80px)
  };

  return (
    <img 
      src="/winwin_logo_halloween.png"
      alt="WIN WIN ハロウィンロゴ"
      className={`${sizeClasses[size]} ${className} object-contain`}
      style={{ 
        backgroundColor: 'transparent'
      }}
    />
  );
};

export default WinWinLogo;