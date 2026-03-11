export const metadata = {
    title: 'Política de Privacidade — Dashboard OSS',
    description: 'Política de Privacidade do aplicativo Dashboard OSS para integração com Meta/Instagram.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 px-6 py-12 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
            <p className="text-sm text-gray-500 mb-8">Última atualização: 11 de março de 2026</p>

            <section className="space-y-6 text-sm leading-relaxed">
                <div>
                    <h2 className="text-lg font-semibold mb-2">1. Introdução</h2>
                    <p>
                        Este aplicativo (&quot;Dashboard OSS&quot;) é uma ferramenta de análise de métricas para
                        contas Instagram profissionais. Ao utilizar este aplicativo, você concorda com a coleta
                        e uso de informações conforme descrito nesta política.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">2. Dados Coletados</h2>
                    <p>Ao conectar sua conta Instagram via Meta Graph API, coletamos:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Métricas públicas de posts (curtidas, comentários, tipo de mídia, data de publicação)</li>
                        <li>Métricas privadas de insights (alcance, saves, compartilhamentos)</li>
                        <li>Texto de legendas e hashtags dos posts</li>
                        <li>Comentários recebidos nos posts</li>
                        <li>Nome de usuário e informações básicas do perfil</li>
                    </ul>
                    <p className="mt-2">
                        <strong>Não coletamos:</strong> senhas, mensagens diretas, dados de pagamento,
                        informações de localização em tempo real, ou dados de outros usuários que não
                        tenham autorizado o acesso.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">3. Como Utilizamos os Dados</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Exibir métricas de desempenho e analytics no dashboard</li>
                        <li>Gerar relatórios estratégicos e análises estatísticas</li>
                        <li>Sugerir respostas automáticas para comentários (com aprovação do usuário)</li>
                        <li>Análise de hashtags e melhor horário para publicação</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">4. Armazenamento de Dados</h2>
                    <p>
                        Os dados são armazenados localmente no dispositivo do usuário em um banco de dados
                        SQLite. Nenhum dado é transmitido para servidores externos, exceto quando
                        explicitamente solicitado pelo usuário (ex: geração de relatório via IA).
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">5. Compartilhamento de Dados</h2>
                    <p>
                        Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros.
                        Os dados podem ser enviados para serviços de IA (Google Gemini) apenas quando
                        o usuário solicita explicitamente a geração de relatórios estratégicos.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">6. Tokens de Acesso</h2>
                    <p>
                        Os tokens de acesso da Meta Graph API são armazenados localmente e utilizados
                        exclusivamente para acessar os dados autorizados pelo usuário. Os tokens podem
                        ser revogados a qualquer momento através das configurações do Facebook/Instagram.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">7. Seus Direitos</h2>
                    <p>Você tem o direito de:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Solicitar a exclusão de todos os seus dados armazenados</li>
                        <li>Revogar o acesso do aplicativo à sua conta Instagram a qualquer momento</li>
                        <li>Solicitar uma cópia dos dados armazenados</li>
                        <li>Desconectar sua conta e remover todos os dados locais</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">8. Segurança</h2>
                    <p>
                        Implementamos medidas de segurança para proteger seus dados, incluindo
                        armazenamento local criptografado e comunicação via HTTPS com as APIs da Meta.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">9. Alterações nesta Política</h2>
                    <p>
                        Podemos atualizar esta política periodicamente. Quaisquer alterações serão
                        publicadas nesta página com a data de atualização revisada.
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">10. Contato</h2>
                    <p>
                        Para dúvidas sobre esta política de privacidade ou sobre o tratamento dos seus
                        dados, entre em contato através do repositório do projeto no GitHub.
                    </p>
                </div>
            </section>

            <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
                Dashboard OSS — Ferramenta de Analytics para Instagram
            </footer>
        </div>
    );
}
