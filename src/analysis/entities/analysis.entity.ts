import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('analysis')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  filePath: string;

  @Column('text')
  userIntent: string;

  @Column('text', { nullable: true })
  aiAnalysisResult: string;

  @Column('jsonb', { nullable: true })
  highlights: {
    id: number;
    element: string;
    issue: string;
    severity: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];

  @Column({ default: 'pending' })
  status: string; // 'pending', 'processing', 'completed', 'failed'

  @CreateDateColumn()
  createdAt: Date;
}
