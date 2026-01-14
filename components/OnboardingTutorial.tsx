import React, { useEffect } from 'react';
import { driver } from "driver.js";
import { markTutorialSeen } from '../services/firebase';

interface OnboardingTutorialProps {
  userId: string;
  hasSeenTutorial: boolean;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ userId, hasSeenTutorial }) => {
  
  useEffect(() => {
    if (hasSeenTutorial) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Entendi!',
      popoverClass: 'driverjs-theme', // defined in index.html styles
      steps: [
        { 
          element: '#root', 
          popover: { 
            title: 'Bem-vindo ao ListaInteligente! 👋', 
            description: 'Vamos fazer um tour rápido para você aproveitar ao máximo seu novo assistente de compras.' 
          } 
        },
        { 
          element: '#menu-toggle', 
          popover: { 
            title: 'Menu e Dispensa', 
            description: 'Aqui você acessa suas diferentes listas, gerencia a Dispensa (estoque de casa) e vê o histórico de compras.' 
          } 
        },
        { 
          element: '#smart-input-area', 
          popover: { 
            title: 'Entrada Inteligente', 
            description: 'Digite "café, leite e pão" para adicionar tudo de uma vez. Ou peça uma receita para a IA adicionar os ingredientes!',
            side: 'top',
            align: 'center'
          } 
        },
        { 
          element: '#ai-chat-button', 
          popover: { 
            title: 'Assistente IA', 
            description: 'Precisa de ajuda? Fale com a IA para planejar refeições, organizar categorias ou tirar dúvidas.',
            side: 'left'
          } 
        },
        { 
          element: '#header-title', 
          popover: { 
            title: 'Tudo pronto!', 
            description: 'Toque no nome da lista para ver detalhes ou compartilhar com a família. Boas compras!' 
          } 
        }
      ],
      onDestroyed: () => {
        // Mark as seen when tour finishes or is skipped
        markTutorialSeen(userId);
      }
    });

    // Slight delay to ensure elements are mounted
    const timer = setTimeout(() => {
        driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasSeenTutorial, userId]);

  return null; // This component doesn't render DOM elements itself, just triggers the driver
};