import type { FastifyRequest, FastifyReply } from 'fastify'
import { AddHuntedGuildUseCase } from '../../app/usecases/guild/AddHuntedGuildUseCase.js'
import { ListHuntedGuildsUseCase } from '../../app/usecases/guild/ListHuntedGuildsUseCase.js'
import { RemoveHuntedGuildUseCase } from '../../app/usecases/guild/RemoveHuntedGuildUseCase.js'
import type { AddGuildDTO, UpdateGuildDTO } from '../validators/guild.validator.js'
import { container } from '../../bootstrap/container.js'
import { ApiError } from '../errors/ApiError.js'

/**
 * Controller para gerenciar guilds monitoradas.
 */
export class GuildController {
  /**
   * GET /api/guilds
   * Lista todas as guilds monitoradas do tenant.
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      // TODO: Pegar tenantId do usuário autenticado
      // Por enquanto, usa o primeiro grupo ativo
      const groups = await container.botGroupRepository.listActive()
      if (groups.length === 0) {
        throw new ApiError('Nenhum grupo cadastrado', 404)
      }

      const tenantId = groups[0]!.tenantId!

      const useCase = new ListHuntedGuildsUseCase(
        container.huntedGuildRepository,
        container.gameWorldRepository,
        container.gameServerRepository
      )

      const guilds = await useCase.execute({ tenantId })

      return reply.status(200).send({
        success: true,
        data: guilds,
        meta: {
          total: guilds.length
        }
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * GET /api/guilds/:id
   * Busca uma guild específica por ID.
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params

      const guild = await container.huntedGuildRepository.findById(id)

      if (!guild) {
        throw new ApiError('Guild não encontrada', 404)
      }

      // Enriquece com informações de world e servidor
      const world = await container.gameWorldRepository.findById(guild.worldId)
      const server = world ? await container.gameServerRepository.findById(world.serverId) : null

      return reply.status(200).send({
        success: true,
        data: {
          ...guild,
          world: world ? {
            id: world.id,
            name: world.worldName,
            identifier: world.worldIdentifier
          } : null,
          server: server ? {
            id: server.id,
            name: server.serverName,
            displayName: server.displayName
          } : null
        }
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * POST /api/guilds
   * Adiciona uma nova guild à lista de monitoramento.
   */
  async create(request: FastifyRequest<{ Body: AddGuildDTO }>, reply: FastifyReply) {
    try {
      const body = request.body

      // TODO: Pegar tenantId e botGroupId do usuário autenticado
      const groups = await container.botGroupRepository.listActive()
      if (groups.length === 0) {
        throw new ApiError('Nenhum grupo cadastrado', 404)
      }

      const group = groups[0]!
      if (!group.tenantId) {
        throw new ApiError('Grupo sem tenant configurado', 400)
      }

      const useCase = new AddHuntedGuildUseCase(
        container.huntedGuildRepository,
        container.gameServerRepository,
        container.gameWorldRepository,
        container.botGroupRepository
      )

      const guild = await useCase.execute({
        tenantId: group.tenantId,
        tenantName: group.tenantName || 'Default Tenant',
        botGroupId: group.id!,
        serverName: body.serverName,
        worldName: body.worldName,
        guildName: body.guildName,
        notifyDeaths: body.notifyDeaths,
        notifyLevelUps: body.notifyLevelUps,
        minLevelNotify: body.minLevelNotify
      })

      return reply.status(201).send({
        success: true,
        data: guild,
        message: 'Guild adicionada com sucesso'
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * PATCH /api/guilds/:id
   * Atualiza configurações de uma guild.
   */
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateGuildDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params
      const body = request.body

      // Filtra apenas as propriedades definidas
      const settings: {
        notifyDeaths?: boolean
        notifyLevelUps?: boolean
        minLevelNotify?: number
      } = {}

      if (body.notifyDeaths !== undefined) settings.notifyDeaths = body.notifyDeaths
      if (body.notifyLevelUps !== undefined) settings.notifyLevelUps = body.notifyLevelUps
      if (body.minLevelNotify !== undefined) settings.minLevelNotify = body.minLevelNotify

      const guild = await container.huntedGuildRepository.updateNotificationSettings(id, settings)

      if (!guild) {
        throw new ApiError('Guild não encontrada', 404)
      }

      return reply.status(200).send({
        success: true,
        data: guild,
        message: 'Guild atualizada com sucesso'
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * DELETE /api/guilds/:id
   * Remove uma guild da lista de monitoramento (soft delete).
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params

      // TODO: Pegar tenantId do usuário autenticado
      const groups = await container.botGroupRepository.listActive()
      const tenantId = groups[0]?.tenantId

      if (!tenantId) {
        throw new ApiError('Tenant não encontrado', 404)
      }

      const useCase = new RemoveHuntedGuildUseCase(container.huntedGuildRepository)

      await useCase.execute({
        guildId: id,
        tenantId
      })

      return reply.status(200).send({
        success: true,
        message: 'Guild removida com sucesso'
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * POST /api/guilds/:id/activate
   * Reativa uma guild que foi removida.
   */
  async activate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params

      await container.huntedGuildRepository.activate(id)

      return reply.status(200).send({
        success: true,
        message: 'Guild reativada com sucesso'
      })
    } catch (error) {
      throw error
    }
  }
}
