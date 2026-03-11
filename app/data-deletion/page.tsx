export const metadata = {
    title: 'Exclusão de Dados — Dashboard OSS',
    description: 'Instruções para exclusão de dados do aplicativo Dashboard OSS.',
};

export default function DataDeletionPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 px-6 py-12 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Solicitação de Exclusão de Dados</h1>
            <p className="text-sm text-gray-500 mb-8">Última atualização: 11 de março de 2026</p>

            <section className="space-y-6 text-sm leading-relaxed">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Como Excluir seus Dados</h2>
                    <p>
                        O Dashboard OSS armazena todos os dados localmente no seu dispositivo.
                        Para excluir completamente seus dados, siga os passos abaixo:
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">1. Remover dados do Dashboard</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Acesse as Configurações do Dashboard</li>
                        <li>Na seção &quot;Contas&quot;, clique em excluir para cada conta conectada</li>
                        <li>Todos os dados de métricas, comentários e análises serão removidos permanentemente</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">2. Revogar acesso no Facebook/Instagram</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Acesse <strong>Facebook &rarr; Configurações &rarr; Aplicativos e Sites</strong></li>
                        <li>Encontre o &quot;Dashboard OSS&quot; na lista de aplicativos</li>
                        <li>Clique em &quot;Remover&quot; para revogar completamente o acesso</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">3. Confirmação</h2>
                    <p>
                        Como todos os dados são armazenados localmente, a exclusão é imediata e
                        irreversível. Não mantemos cópias dos seus dados em servidores externos.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">Contato</h2>
                    <p>
                        Se precisar de assistência com a exclusão de dados, entre em contato
                        através do repositório do projeto no GitHub.
                    </p>
                </div>
            </section>

            <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
                Dashboard OSS — Ferramenta de Analytics para Instagram
            </footer>
        </div>
    );
}
