/**
 * KakaoTalk Sharing Utility
 */

export const shareReferralCode = (referralCode: string, userName: string) => {
  if (!(window as any).Kakao) {
    console.error('Kakao SDK not loaded');
    return;
  }

  const Kakao = (window as any).Kakao;
  
  // Initialize if not initialized
  if (!Kakao.isInitialized()) {
    // Note: The key will be fetched from env in a real app, 
    // but for the SDK to work client-side, it's often hardcoded or injected.
    // We'll try to use the one already in the environment if possible.
    const apiKey = import.meta.env.VITE_KAKAO_JS_KEY;
    if (apiKey) Kakao.init(apiKey);
  }

  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: 'EnglishBites 친구 초대 🎁',
      description: `${userName}님이 보내신 선물! 지금 가입할 때 코드 [${referralCode}]를 입력하고 결제하면, 추천인에게 20,000포인트(=20,000원)가 지급되어 함께 나눠 쓸 수 있어요.`,
      imageUrl: 'https://englishbites.pages.dev/logo.png', // Replace with your actual logo URL
      link: {
        mobileWebUrl: window.location.origin,
        webUrl: window.location.origin,
      },
    },
    buttons: [
      {
        title: '코드 입력하고 가입하기',
        link: {
          mobileWebUrl: `${window.location.origin}/?ref=${referralCode}`,
          webUrl: `${window.location.origin}/?ref=${referralCode}`,
        },
      },
    ],
  });
};
