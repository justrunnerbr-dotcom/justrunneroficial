'use client'

/** Botão de formulário que pede confirmação antes de enviar (aprovar, excluir…). */
export function BotaoConfirmar({ children, pergunta, className, formAction }: {
  children: React.ReactNode
  pergunta: string
  className?: string
  formAction?: (formData: FormData) => void | Promise<void>
}) {
  return (
    <button
      className={className}
      formAction={formAction}
      onClick={e => { if (!window.confirm(pergunta)) e.preventDefault() }}
    >
      {children}
    </button>
  )
}
