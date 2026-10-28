import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transacao, TransacaoDocument } from './transacao.schema';
import { CreateTransacaoDto } from './dto/create-transacao.dto';

export interface Metricas {
  saldoTotal: number;
  totalDespesas: number;
  totalGastoImpulso: number;
}

export interface ResumoTransacoes {
  historico: Transacao[];
  metricas: Metricas;
}

@Injectable()
export class TransacoesService {
  constructor(
    @InjectModel(Transacao.name)
    private readonly transacaoModel: Model<TransacaoDocument>,
  ) {}

  async criar(dto: CreateTransacaoDto): Promise<Transacao> {
    return this.transacaoModel.create(dto);
  }

  async listar(): Promise<ResumoTransacoes> {
    const historico = await this.transacaoModel.find().lean().exec();
    return {
      historico: historico as unknown as Transacao[],
      metricas: this.calcularMetricas(historico as unknown as Transacao[]),
    };
  }

  /** Processa o histórico e devolve as métricas consolidadas. */
  calcularMetricas(transacoes: Transacao[]): Metricas {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalGastoImpulso = 0;

    for (const t of transacoes) {
      if (t.tipo === 'receita') {
        totalReceitas += t.valor;
      } else if (t.tipo === 'despesa') {
        totalDespesas += t.valor;
        if (t.consumoConsciente === false) {
          totalGastoImpulso += t.valor;
        }
      }
    }

    return {
      saldoTotal: this.arredondar(totalReceitas - totalDespesas),
      totalDespesas: this.arredondar(totalDespesas),
      totalGastoImpulso: this.arredondar(totalGastoImpulso),
    };
  }

  // Evita erros de ponto flutuante (ex.: 0.1 + 0.2) em valores monetários.
  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
