import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransacoesService } from '../src/transacoes/transacoes.service';
import { Transacao } from '../src/transacoes/transacao.schema';

describe('TransacoesService - métricas', () => {
  let service: TransacoesService;

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      providers: [
        TransacoesService,
        { provide: getModelToken(Transacao.name), useValue: {} },
      ],
    }).compile();
    service = modulo.get(TransacoesService);
  });

  const t = (
    tipo: 'receita' | 'despesa',
    valor: number,
    consumoConsciente: boolean,
  ): Transacao => ({
    descricao: 'x',
    categoria: 'x',
    tipo,
    valor,
    consumoConsciente,
  });

  it('retorna zeros quando não há transações', () => {
    expect(service.calcularMetricas([])).toEqual({
      saldoTotal: 0,
      totalDespesas: 0,
      totalGastoImpulso: 0,
    });
  });

  it('calcula saldo, total de despesas e gasto por impulso', () => {
    const metricas = service.calcularMetricas([
      t('receita', 3000, true),
      t('despesa', 1200, true), // moradia
      t('despesa', 150, false), // compra por impulso
      t('despesa', 80.5, false), // compra por impulso
    ]);
    expect(metricas.saldoTotal).toBe(1569.5);
    expect(metricas.totalDespesas).toBe(1430.5);
    expect(metricas.totalGastoImpulso).toBe(230.5);
  });

  it('não conta receita como gasto por impulso', () => {
    const metricas = service.calcularMetricas([t('receita', 500, false)]);
    expect(metricas.totalGastoImpulso).toBe(0);
    expect(metricas.saldoTotal).toBe(500);
  });

  it('evita erro de ponto flutuante', () => {
    const metricas = service.calcularMetricas([
      t('despesa', 0.1, false),
      t('despesa', 0.2, false),
    ]);
    expect(metricas.totalDespesas).toBe(0.3);
  });
});
