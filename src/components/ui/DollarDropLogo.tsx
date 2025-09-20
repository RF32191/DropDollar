interface DollarDropLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function DollarDropLogo({ size = 'md', className = '' }: DollarDropLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <img
        src="/DropCoin.png"
        alt="Dollar Drop Coin Logo - Your custom green coin with 1 cutting through dollar symbol"
        className="w-full h-full object-contain"
      />
    </div>
  );
}