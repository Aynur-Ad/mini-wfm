import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TeamSuggestionsService } from './team-suggestions.service.js';
@Controller()
export class TeamSuggestionsController {
  constructor(private readonly suggestions: TeamSuggestionsService) {}
  @MessagePattern('findWorkOrderTeamSuggestions') find(@Payload() id: number) {
    return this.suggestions.suggest(id);
  }
}
