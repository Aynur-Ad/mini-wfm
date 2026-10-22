import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity ({ schema: 'workforce', name: 'workforce_user' })
export class WorkforceUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column ({ type: 'varchar' , length: 100})
    firstName: string;

    @Column ({ type: 'varchar', length: 100 })
    lastName: string;

    @Column ({ type: 'varchar', length: 20, unique: true })
    registrationNumber: string;

    @Column ({ type: 'varchar', length: 10, nullable: true })
    phone: string;

    @Column ({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn ({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn ({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}

