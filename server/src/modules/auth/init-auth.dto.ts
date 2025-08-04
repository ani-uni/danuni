import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class InitNewAdminDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty({ message: '邮箱?' })
  email: string

  @IsString()
  @IsNotEmpty({ message: '昵称?' })
  name: string

  @IsString()
  @IsNotEmpty({ message: '密码?' })
  password: string
}
